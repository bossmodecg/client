import { EventEmitter2 } from 'eventemitter2';

import { Logger } from './logger';

import _ from 'lodash';
import io from 'socket.io-client';
const jsondiffpatch = require('jsondiffpatch').create({});

const DEFAULT_CONFIG =
  Object.freeze(
    {
      broadcastUnrecognizedNamespaceEvents: false
    }
  );
const CLIENT_TYPES = [ 'frontend', 'management' ];

const logger = new Logger("bossmodecg-client");

export default class Client extends EventEmitter2 {
  constructor(config, proxyFactory) {
    super({ wildcard: true, newListener: false });

    this._setupEvents = this._setupEvents.bind(this);
    this.connect = this.connect.bind(this);

    this._config = Object.freeze(_.merge({}, DEFAULT_CONFIG, config));

    if (typeof(this._config.identifier) !== 'string') {
      throw new Error("BossmodeCG requires a string that identifies this client.");
    }

    this._clientType = this._config.clientType;
    if (CLIENT_TYPES.indexOf(this._clientType) < 0) {
      throw new Error(`Invalid client type for a BossmodeCG client: ${this._clientType}`);
    }

    this._proxyFactory = proxyFactory;

    this._state = {};
    this._isConnected = false;
    this._isAuthenticated = false;
    this._isPopulated = false;

    this._moduleProxies = {};
  }

  get id() { return this._isConnected ? this._socket.id : "not connected"; }
  get config() { return this._config; }
  get clientType() { return this._clientType; }

  get isConnected() { return this._isConnected; }
  get isAuthenticated() { return this._isAuthenticated; }
  get isPopulated() { return this._isPopulated; }

  connect() {
    logger.info(`Connecting to '${this._config.endpoint}'.`)

    this._socket = io(this._config.endpoint, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax : 5000,
      reconnectionAttempts: Infinity
    });

    if (window) {
      logger.debug("Attaching self to the window.");
      window.bossmodecgClients = window.bossmodecgClients || [];
      window.bossmodecgClients.push(this);
    }

    this._setupEvents();

    this._socket.connect();
  }

  module(bmName) {
    const proxy = this._moduleProxies[bmName];

    if (!proxy) {
      logger.warn(`Requested unrecognized module '${bmName}'.`);
    }

    return proxy;
  }

  moduleMayFail(bmName) {
    return this._moduleProxies[bmName];
  }

  _setupEvents() {
    const socket = this._socket;

    socket.on('connect', () => {
      logger.info("Connected to server. Identifying.");
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
      logger.info("Disconnected from server.");

      this._isConnected = false;
      this._isAuthenticated = false;
      this.emit('bossmodecg.disconnected');
      this.emit('bossmodecg.forceUpdate');
    });

    socket.on('authenticationSucceeded', () => {
      logger.info("Authentication succeeded.");

      this._isAuthenticated = true;
      this.emit('bossmodecg.authenticated');
      this.emit('bossmodecg.forceUpdate');
    });

    socket.on('state', (fullState) => {
      logger.debug(`Full state sent by server.`);

      Object.keys(fullState).forEach((bmName) => {
        var proxy = this._moduleProxies[bmName];

        if (!proxy) {
          logger.debug(`Instantiating proxy for '${bmName}'.`)

          this._moduleProxies[bmName] = proxy = this._createNewProxy(bmName);
        }

        proxy._fullStateUpdate(fullState[bmName]);
      });

      this._isPopulated = true;
      this.emit('bossmodecg.forceUpdate');
    });

    socket.on('stateDelta', (event) => {
      const bmName = event.bmName;
      const delta = event.delta;

      const proxy = this._moduleProxies[bmName];

      if (!proxy) {
        logger.warn(`Received a state delta for '${bmName}', but no proxy specified.`);
      } else {
        proxy._applyStateDelta(delta);
      }

      this.emit('bossmodecg.forceUpdate');
    })

    socket.on('pushdownEvent', (pushdownEvent) => {
      logger.debug(`Pushdown event: ${pushdownEvent.eventName}`);

      const tokens = pushdownEvent.eventName.split(".")[0];
      const namespace = tokens[0];
      const localEventName = tokens[1];

      if (namespace === 'bossmodecg') {
        this.emit(eventName, event);
      } else {
        const proxy = this._moduleProxies[namespace];

        if (proxy && localEventName) {
          proxy.emit(localEventName, event);
        } else {
          if (this._config.broadcastUnrecognizedNamespaceEvents) {
            // we can choose to broadcast events with unrecognized namespaces if we want.
            this.emit(eventName, event);
          } else {
            // otherwise, scream and drop it on the floor.
            logger.warn(`Received event '${eventName}' with unrecognized/missing namespace.`);
          }
        }
      }

      this.emit(pushdownEvent.eventName, pushdownEvent.event);
    });
  }

  _createNewProxy(bmName) {
    const proxy = this._proxyFactory(bmName);

    proxy.onAny((eventName, event) => {
      if (!eventName.startsWith("private.")) {
        this.emit(`${bmName}.${eventName}`, event);
      }
    });

    return proxy;
  }
}
