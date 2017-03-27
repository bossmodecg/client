import FrontendClient from './FrontendClient';
import ManagementClient from './ManagementClient';

const m =
  Object.freeze(
    {
      FrontendClient: FrontendClient,
      ManagementClient: ManagementClient
    }
  );

export default m;
