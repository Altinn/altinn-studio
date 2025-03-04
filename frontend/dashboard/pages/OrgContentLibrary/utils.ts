import { SelectedContextType } from '../../enums/SelectedContextType';

export function isOrg(contextType: string): boolean {
  const notOrgContexts: string[] = [
    SelectedContextType.Self,
    SelectedContextType.All,
    SelectedContextType.None,
  ];
  return !notOrgContexts.includes(contextType);
}
