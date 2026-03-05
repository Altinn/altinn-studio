import { queryOptions } from '@tanstack/react-query';
import axios from 'axios';

interface PostalCodesRegistry {
  places: (string | null)[];
  mapping: number[];
}

export function lookupPostPlace(data: PostalCodesRegistry, zip: string): string {
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

export const postalCodesQuery = queryOptions({
  queryKey: ['postalCodes'],
  queryFn: async (): Promise<PostalCodesRegistry> => {
    const { data } = await axios.get<PostalCodesRegistry>('https://altinncdn.no/postcodes/registry.json');
    return data;
  },
  staleTime: Infinity,
});
