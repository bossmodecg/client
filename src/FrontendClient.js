import _ from 'lodash';

import Client from './Client';

import FrontendProxy from './FrontendProxy';

export default class FrontendClient extends Client {
  constructor(config) {
    super(_.merge({}, config, { clientType: 'frontend' }), (bmName) => new FrontendProxy(this, bmName));
  }
}
