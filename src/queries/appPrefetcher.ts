import { matchPath } from 'react-router-dom';

import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { useApplicationMetadataQueryDef } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useApplicationSettingsQueryDef } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useFooterLayoutQueryDef } from 'src/features/footer/FooterLayoutProvider';
import { useLayoutSetsQueryDef } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useInstanceDataQueryDef } from 'src/features/instance/InstanceContext';
import { useProcessQueryDef } from 'src/features/instance/ProcessContext';
import { useOrgsQueryDef } from 'src/features/orgs/OrgsProvider';
import { useCurrentPartyQueryDef, usePartiesQueryDef } from 'src/features/party/PartiesProvider';
import { useProfileQueryDef } from 'src/features/profile/ProfileProvider';

/**
 * Prefetches requests that require no processed data to determine the url
 */
export function AppPrefetcher() {
  usePrefetchQuery(useApplicationMetadataQueryDef());
  usePrefetchQuery(useLayoutSetsQueryDef());
  usePrefetchQuery(useProfileQueryDef(true));
  usePrefetchQuery(useOrgsQueryDef());
  usePrefetchQuery(useApplicationSettingsQueryDef());
  usePrefetchQuery(useFooterLayoutQueryDef());
  usePrefetchQuery(usePartiesQueryDef(true));
  usePrefetchQuery(useCurrentPartyQueryDef(true));

  const { partyId, instanceGuid } =
    matchPath({ path: '/instance/:partyId/:instanceGuid/*' }, window.location.hash.slice(1))?.params ?? {};
  const instanceId = partyId && instanceGuid ? `${partyId}/${instanceGuid}` : undefined;

  usePrefetchQuery(useInstanceDataQueryDef(true, partyId, instanceGuid));
  usePrefetchQuery(useProcessQueryDef(instanceId));

  return null;
}
