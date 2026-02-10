import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { ILayoutSettings } from 'src/layout/common.generated';

export class LayoutApi {
  public static async getLayoutSettings(layoutSetId: string) {
    try {
      const layoutSetting = await axiosInstance
        .get<ILayoutSettings>(`/api/layoutsettings/${layoutSetId}`)
        .then((response) => response.data);

      return layoutSetting;
    } catch (error) {
      // TODO: do something else? Only log in dev mode.*
      // eslint-disable-next-line no-console
      console.log('Fetching layoutSettings failed:\n', error);
    }
  }
}
