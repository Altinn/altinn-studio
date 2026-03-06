import { httpGet } from 'src/utils/network/sharedNetworking';
import { getInstanceLayoutsUrl, getLayoutsUrl } from 'src/utils/urls/appUrlHelper';
import type { ILayoutCollection } from 'src/layout/layout';

export class LayoutApi {
  public static async getLayouts(layoutSetId: string): Promise<ILayoutCollection> {
    return httpGet(getLayoutsUrl(layoutSetId));
  }

  public static async getLayoutsForInstance(layoutSetId: string, instanceId: string): Promise<ILayoutCollection> {
    return httpGet(getInstanceLayoutsUrl(layoutSetId, instanceId));
  }
}
