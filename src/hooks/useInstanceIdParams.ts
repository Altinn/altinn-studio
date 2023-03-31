import { useLocation } from 'react-router-dom';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';

export function useInstanceIdParams() {
  const { pathname } = useLocation();
  const instanceIdRegExpr = getInstanceIdRegExp({ prefix: 'instance' });
  const match = pathname.match(instanceIdRegExpr);
  if (match) {
    const [partyId, instanceGuid] = match[1].split('/');
    return { partyId, instanceGuid, instanceId: `${partyId}/${instanceGuid}` };
  }
  return {};
}
