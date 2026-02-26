import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { ILayoutSettings } from 'src/layout/common.generated';
import type { ILayoutCollection } from 'src/layout/layout';

export class LayoutApi {
  public static async getLayoutSettings(layoutSetId: string) {
    return axiosInstance.get<ILayoutSettings>(`/api/layoutsettings/${layoutSetId}`).then((response) => response.data);
  }

  public static async getLayout(layoutSetId: string) {
    return axiosInstance.get<ILayoutCollection>(`/api/layouts/${layoutSetId}`).then((response) => response.data);
  }
}
