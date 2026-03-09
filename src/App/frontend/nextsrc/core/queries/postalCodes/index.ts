import { useQuery } from '@tanstack/react-query';
import { lookupPostPlace, postalCodesQuery } from 'nextsrc/core/queries/postalCodes/postalCodes.queries';

export function usePostPlace(zipCode: string | undefined, enabled: boolean): string {
  const _enabled = enabled && Boolean(zipCode?.length) && zipCode !== '' && zipCode !== '0';

  const { data } = useQuery({
    ...postalCodesQuery,
    enabled: _enabled,
  });

  if (!_enabled || !data) {
    return '';
  }

  return lookupPostPlace(data, zipCode!);
}
