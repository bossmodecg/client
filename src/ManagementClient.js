import Client from './Client';

export default class ManagementClient extends Client {
  constructor(config) {
    super(_.merge({}, config, { clientType: 'management' }));
  }
}
