import { useQuery } from '@tanstack/react-query';

import axios from 'axios';

interface PostalCodesRegistry {
  places: (string | null)[];
  mapping: number[];
}

function lookupPostPlace(data: PostalCodesRegistry, zip: string): string {
  const index = parseInt(zip, 10);
  if (isNaN(index) || index < 0 || index >= data.mapping.length) {
    return '';
  }
  const placeIndex = data.mapping[index];
  if (placeIndex === 0) {
    return '';
  }
  return data.places[placeIndex] ?? '';
}

async function fetchPostalCodes(): Promise<PostalCodesRegistry> {
  const { data } = await axios.get<PostalCodesRegistry>('https://altinncdn.no/postcodes/registry.json');
  return data;
}

export function usePostPlace(zipCode: string | undefined, enabled: boolean): string {
  const _enabled = enabled && Boolean(zipCode?.length) && zipCode !== '' && zipCode !== '0';

  const { data } = useQuery({
    queryKey: ['postalCodes'],
    queryFn: fetchPostalCodes,
    staleTime: Infinity,
    enabled: _enabled,
  });

  if (!_enabled || !data) {
    return '';
  }

  return lookupPostPlace(data, zipCode!);
}
