import _ from 'lodash';

import { EventEmitter2 } from 'eventemitter2';

import { Logger } from './logger';

const jsondiffpatch = require('jsondiffpatch').create({});

/**
 * FrontendProxy is a read-only representation of the server state and handles
 * specific event notifications on a module-by-module basis.
 */
export default class ModuleProxy extends EventEmitter2 {
  constructor(client, bmName) {
    super({ wildcard: true, newListener: false });

    this._fullStateUpdate = this._fullStateUpdate.bind(this);
    this._applyStateDelta = this._applyStateDelta.bind(this);

    this.logger = new Logger(`proxy-${bmName}`);
    this.logger.debug("Instantiating.");

    this._name = bmName;
    this._client = client;

    this._state = null;
  }

  get name() { return this._name; }
  get client() { return this._client; }

  // HMM: is returning {} the right thing here if it has no state (has not been pulled from server)?
  get state() { return this._state || {}; }
  get safeState() { return _.cloneDeep(this.state); }

  _fullStateUpdate(newState) {
    this.logger.debug("Full state update.");
    const oldState = this._state;
    this._state = _.cloneDeep(newState);

    let delta = null;

    if (typeof oldState !== 'undefined') {
      delta = jsondiffpatch.diff(oldState, this._state);
    }

    this.emit(`stateChanged`, { delta, state: newState });
  }

  _applyStateDelta(delta) {
    this.logger.trace("State delta update.");
    jsondiffpatch.patch(this._state, delta);

    this.emit(`stateChanged`, { delta, state: _.cloneDeep(this._state) });
  }
}
