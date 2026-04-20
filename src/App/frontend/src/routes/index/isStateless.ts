import { GlobalData } from 'src/GlobalData';

export function isStateless(): boolean {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  return entryType !== 'new-instance' && entryType !== 'select-instance';
}
