import { AltinnGlobalData } from 'nextsrc/utils/AltinnGlobalData';

export class AppRoutes {
  public static instanceUrl(instanceOwnerPartyId: string, instanceGuid: string) {
    return `${AppRoutes.origin}/instance/${instanceOwnerPartyId}/${instanceGuid}`;
  }

  public static get selectInstanceUrl() {
    return `${AppRoutes.origin}/instance-selection`;
  }

  private static get origin() {
    return `${window.location.origin}/${AltinnGlobalData.org}/${AltinnGlobalData.app}`;
  }
}
