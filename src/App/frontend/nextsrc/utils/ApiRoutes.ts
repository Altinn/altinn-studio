import { AltinnGlobalData } from 'nextsrc/utils/AltinnGlobalData';

export class ApiRoutes {
  public static createInstanceUrl(partyId: number, language?: string) {
    const url = `${ApiRoutes.origin}/instance?instanceOwnerPartyId=${partyId}`;

    if (!language) {
      return url;
    }

    return `${url}&language=${language}`;
  }

  private static get origin() {
    return `${window.location.origin}/${AltinnGlobalData.org}/${AltinnGlobalData.app}`;
  }
}
