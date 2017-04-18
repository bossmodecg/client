import moment from 'moment';

// TODO: this logging kinda sucks for frontend, because Chrome will show "logger.js:50" or whatever as the call site.
export class Logger {
  constructor(category) {
    this._category = (category || _category || "unspecified").toLowerCase();

    this.errorFn = console.error;
    this.warnFn = console.warn;
    this.infoFn = console.log;
    this.debugFn = console.debug;
    this.traceFn = console.debug;

    this.error = this.error.bind(this);
    this.showError = true;
    this.warn = this.warn.bind(this);
    this.showWarn = true;
    this.info = this.info.bind(this);
    this.showInfo = true;
    this.debug = this.debug.bind(this);
    this.showDebug = true;
    this.trace = this.trace.bind(this);
    this.showTrace = true;
  }

  error(msg) {
    this.showError && this.errorFn(`E ${moment().toISOString()} [${this._category}] ${this._handleMessage(msg)}`);
  }

  warn(msg) {
    this.showWarn && this.warnFn(`W ${moment().toISOString()} [${this._category}] ${this._handleMessage(msg)}`);
  }

  info(msg) {
    this.showInfo && this.infoFn(`I ${moment().toISOString()} [${this._category}] ${this._handleMessage(msg)}`);
  }

  debug(msg) {
    this.showDebug && this.debugFn(`D ${moment().toISOString()} [${this._category}] ${this._handleMessage(msg)}`);
  }

  trace(msg) {
    this.showTrace && this.traceFn(`T ${moment().toISOString()} [${this._category}] ${this._handleMessage(msg)}`);
  }

  _handleMessage(msg) {
    switch(typeof(msg)) {
      case 'function':
        return msg();
      case 'object':
        return JSON.stringify(msg);
      default:
        return msg;
    }
  }
}
