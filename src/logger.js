// eslint-disable-next-line import/prefer-default-export
export class Logger {
  constructor(category) {
    this._category = (category || "unspecified").toLowerCase();

    this.error = console.error;
    this.warn = console.warn;
    this.info = console.log;
    this.debug = console.debug;
    this.trace = console.debug;
  }
}
