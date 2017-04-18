import Proxy from './Proxy';

export default class ManagementProxy extends Proxy {
  constructor(client, bmName) {
    super(client, bmName);

    this.pushEvent = this.pushEvent.bind(this);
  }

  pushEvent(eventName, event) {
    this._client._socket.emit('pushupEvent', { bmName: this.name, eventName: eventName, event: event });
  }

  setState(delta) {
    this._client._socket.emit('stateDelta', { bmName: this.name, delta: delta });
  }
}
