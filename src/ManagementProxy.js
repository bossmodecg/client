import ModuleProxy from './ModuleProxy';

/**
 * ManagementProxy encapsulates FrontendProxy, but enables state change and
 * client-to-server messaging.
 */
export default class ManagementProxy extends ModuleProxy {
  constructor(client, bmName) {
    super(client, bmName);

    this.pushEvent = this.pushEvent.bind(this);
  }

  pushEvent(eventName, event) {
    this._client._socket.emit('pushupEvent', { bmName: this.name, eventName, event });
  }

  setState(delta) {
    this._client._socket.emit('stateDelta', { bmName: this.name, delta });
  }
}
