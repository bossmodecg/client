import Client from './Client';

export default class FrontendClient extends Client {
  constructor(config) {
    super(_.merge({}, config, { clientType: 'frontend' }));
  }
}
