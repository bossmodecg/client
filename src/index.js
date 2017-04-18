import FrontendClient from './FrontendClient';
import ManagementClient from './ManagementClient';

import { Logger } from './logger';

const m =
  Object.freeze(
    {
      FrontendClient: FrontendClient,
      ManagementClient: ManagementClient,
      Logger: Logger
    }
  );

export default m;
