import { EventEmitter2 } from 'eventemitter2';

import _ from 'lodash';
import io from 'socket.io-client';
const jsondiffpatch = require('jsondiffpatch').create({});

const DEFAULT_CONFIG =
  Object.freeze(
    {

    }
  );
const CLIENT_TYPES = [ 'frontend', 'management' ];

function debug_log(msg) {
  console.debug(`[bossmodecg-client] ${msg}`);
}

function info_log(msg) {
  console.log(`[bossmodecg-client] ${msg}`);
}

function warn_log(msg) {
  console.warn(`[bossmodecg-client] ${msg}`);
}

function error_log(msg) {
  console.error(`[bossmodecg-client] ${msg}`);
}

export default class Client extends EventEmitter2 {
  constructor(config) {
    super({ wildcard: true, newListener: false });

    this._setupEvents = this._setupEvents.bind(this);
    this.connect = this.connect.bind(this);
    this.getState = this.getState.bind(this);

    this._config = Object.freeze(_.merge({}, DEFAULT_CONFIG, config));

    if (typeof(this._config.identifier) !== 'string') {
      throw new Error("BossmodeCG requires a string that identifies this client.");
    }

    this._clientType = this._config.clientType;
    if (CLIENT_TYPES.indexOf(this._clientType) < 0) {
      throw new Error(`Invalid client type for a BossmodeCG client: ${this._clientType}`);
    }

    this._state = {};
    this._isConnected = false;
    this._isAuthenticated = false;
  }

  get id() { return this._isConnected ? this._socket.id : "not connected"; }
  get config() { return this._config; }
  get isConnected() { return this._isConnected; }
  get isAuthenticated() { return this._isAuthenticated; }
  get clientType() { return this._clientType; }

  connect() {
    info_log(`Connecting to '${this._config.endpoint}'.`)

    this._socket = io(this._config.endpoint, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax : 5000,
      reconnectionAttempts: Infinity
    });

    if (window) {
      debug_log("Attaching self to the window.");
      window.bossmodecgClients = window.bossmodecgClients || [];
      window.bossmodecgClients.push(this);
    }

    this._setupEvents();

    this._socket.connect();
  }

  getState(bmName) {
    return this._state[bmName] || {};
  }

  _setupEvents() {
    const socket = this._socket;

    socket.on('connect', () => {
      info_log("Connected to server. Identifying.");
      this._isConnected = true;
      socket.emit('identify', {
        identifier: this._config.identifier,
        passphrase: this._config.passphrase,
        clientType: this._config.clientType
      });

      this.emit('bossmodecg.connected');
      this.emit('bossmodecg.forceUpdate');
    });

    socket.on('disconnect', () => {
      info_log("Disconnected from server.");

      this._isConnected = false;
      this._isAuthenticated = false;
      this.emit('bossmodecg.disconnected');
      this.emit('bossmodecg.forceUpdate');
    });

    socket.on('authenticationSucceeded', () => {
      info_log("Authentication succeeded.");

      this._isAuthenticated = true;
      this.emit('bossmodecg.authenticated');
      this.emit('bossmodecg.forceUpdate');
    });

    socket.on('state', (event) => {
      const bmName = event.bmName;
      const newState = event.state;

      debug_log(`Full state for '${bmName}' sent by server.`);

      const oldState = this._state;
      this._state[bmName] = _.cloneDeep(newState);

      var delta = null;

      if (oldState) {
        // since this isn't the first state drop, we need to calculate a diff and provide it.

        delta = jsondiffpatch.diff(oldState, newState);
      }

      this.emit(`${bmName}.stateChanged`, { delta: delta, state: newState });
      this.emit('bossmodecg.forceUpdate');
    });

    socket.on('stateDelta', (event) => {
      const bmName = event.bmName;
      const delta = event.delta;
      const freshState = _.cloneDeep(this._state[bmName]);

      debug_log(`Received a state delta for '${bmName}' from the server.`);

      if (!freshState) {
        warn_log("Received a state delta while client state is not yet set. Ignoring; requesting full state.");

        socket.emit('getFullState');
      } else {
        jsondiffpatch.patch(freshState, delta);

        this._state[bmName] = freshState;
        this.emit(`${bmName}.stateChanged`, { delta: delta, state: _.cloneDeep(freshState) });
        this.emit('bossmodecg.forceUpdate');
      }
    })

    socket.on('pushdownEvent', (pushdownEvent) => {
      debug_log(`Pushdown event: ${pushdownEvent.eventName}`);
      this.emit(pushdownEvent.eventName, pushdownEvent.event);
      this.emit('bossmodecg.forceUpdate');
    });
  }
}
