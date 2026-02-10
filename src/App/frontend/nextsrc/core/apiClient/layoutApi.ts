import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { ILayoutSettings } from 'src/layout/common.generated';
import type { ILayout } from 'src/layout/layout';

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

  public static async getLayout(layoutSetId: string) {
    try {
      const layout = await axiosInstance.get<ILayout>(`/api/layouts/${layoutSetId}`).then((response) => response.data);

      return layout;
    } catch (error) {
      // TODO: do something else? Only log in dev mode.*
      // eslint-disable-next-line no-console
      console.log('Fetching layoutSettings failed:\n', error);
    }
  }
}

//https://ttd.apps.tt02.altinn.no/ttd/frontend-test/api/layouts/message
