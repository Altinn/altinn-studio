import { AltinnGlobalData } from 'nextsrc/utils/AltinnGlobalData';

export class AppRoutes {
  public static instanceUrl(instanceOwnerPartyId: string, instanceGuid: string) {
    return `${AppRoutes.origin}/instance/${instanceOwnerPartyId}/${instanceGuid}`;
  }

  private static get origin() {
    return `${window.location.origin}/${AltinnGlobalData.org}/${AltinnGlobalData.app}`;
  }
}
