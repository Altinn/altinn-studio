// import { AxiosResponse } from 'axios';
// import { post } from '../../../utils/networking';
//  import { verifySubscriptionUrl } from '../../../utils/urlHelper';

export async function verifySubscriptionHook() {
  // TODO: Remove this return and replace with the code below once the API is exposed, issue #2175
  return true;
  /*
  try {
    const result: AxiosResponse = await post(verifySubscriptionUrl);
    return result.data;
  } catch (err) {
    console.error(err);
    return false;
  }
  */
}
