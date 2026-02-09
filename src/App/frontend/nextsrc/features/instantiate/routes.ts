import type { IInstance } from 'src/types/shared';

export class InstantiateRoutes {
  public static readonly root = '/';
  public static readonly instanceSelection = '/instance-selection';
  public static readonly partySelection = '/party-selection';
  public static readonly stateless = '/:pageId';
  public static readonly instance = '/instance/:partyId/:instanceGuid';

  public static forInstance(instance: IInstance): string {
    const [partyId, guid] = instance.id.split('/');
    return `/instance/${partyId}/${guid}`;
  }
}
