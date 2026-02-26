import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { ILayoutCollection } from 'src/layout/layout';

export class LayoutApi {
  public static async getLayout(layoutSetId: string) {
    return axiosInstance.get<ILayoutCollection>(`/api/layouts/${layoutSetId}`).then((response) => response.data);
  }
}
