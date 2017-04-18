import _ from 'lodash';

import Client from './Client';

import ManagementProxy from './ManagementProxy';

export default class ManagementClient extends Client {
  constructor(config) {
    super(_.merge({}, config, { clientType: 'management' }),
         (bmName) => new ManagementProxy(this, bmName));
  }
}
