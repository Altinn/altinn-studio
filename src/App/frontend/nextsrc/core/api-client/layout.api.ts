import { getAltinnAppApi } from 'nextsrc/api/generated/endpoints/altinnAppApi';

import type { ILayoutCollection } from 'src/layout/layout';

// TODO: better types from backend
export class LayoutApi {
  private static altinnAppApi = getAltinnAppApi();

  public static async getLayout(layoutSetId: string) {
    return this.altinnAppApi.getApiLayoutsId(layoutSetId) as unknown as ILayoutCollection;
  }
}
