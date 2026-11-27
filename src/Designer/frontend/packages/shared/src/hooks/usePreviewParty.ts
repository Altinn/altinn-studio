import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { typedLocalStorage } from '@designer/pure-functions';
import type { PreviewParty } from 'app-shared/types/api/PreviewSession';
import { QueryKey } from 'app-shared/types/QueryKey';

const storageKey = 'previewParty';

const storedParty = (): PreviewParty =>
  typedLocalStorage.getItem<PreviewParty>(storageKey) === 'organization'
    ? 'organization'
    : 'person';

export type UsePreviewPartyResult = {
  party: PreviewParty;
  setParty: (party: PreviewParty) => void;
};

/**
 * Whom the user in preview acts for, as the developer chose it in this browser. Every preview on the page follows the
 * choice, since a session acts for one party and a new choice starts a new session.
 */
export const usePreviewParty = (): UsePreviewPartyResult => {
  const queryClient = useQueryClient();
  const { data: party } = useQuery<PreviewParty>({
    queryKey: [QueryKey.PreviewParty],
    queryFn: storedParty,
    initialData: storedParty,
    staleTime: Infinity,
  });
  const setParty = useCallback(
    (newParty: PreviewParty): void => {
      // The choice applies before it is stored, so a browser that can't store it still uses it on this page.
      queryClient.setQueryData([QueryKey.PreviewParty], newParty);
      typedLocalStorage.setItem(storageKey, newParty);
    },
    [queryClient],
  );
  return { party, setParty };
};
