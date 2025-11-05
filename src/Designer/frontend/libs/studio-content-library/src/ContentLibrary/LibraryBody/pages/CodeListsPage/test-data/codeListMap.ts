import type { CodeList } from '../types/CodeList';
import type { CodeListData } from '../types/CodeListData';
import type { CodeListMap } from '../types/CodeListMap';

export const colours: CodeList = [
  { value: 'red', label: { nb: 'Rød', en: 'Red' } },
  { value: 'green', label: { nb: 'Grønn', en: 'Green' } },
  { value: 'blue', label: { nb: 'Blå', en: 'Blue' } },
];
export const coloursData: CodeListData = {
  name: 'colours',
  codes: colours,
};
export const coloursKey = '779c7233-f0c8-449e-84ae-24cf6340e8bc';

export const fruits: CodeList = [
  { value: 'apple', label: { nb: 'Eple', en: 'Apple' } },
  { value: 'banana', label: { nb: 'Banan', en: 'Banana' } },
  { value: 'cherry', label: { nb: 'Kirsebær', en: 'Cherry' } },
];
export const fruitsData: CodeListData = {
  name: 'fruits',
  codes: fruits,
};
export const fruitsKey = '001b2353-bc35-4e48-968d-d95cec09b0bc';

export const countries: CodeList = [
  { value: 'norway', label: { nb: 'Norge', en: 'Norway' } },
  { value: 'sweden', label: { nb: 'Sverige', en: 'Sweden' } },
  { value: 'denmark', label: { nb: 'Danmark', en: 'Denmark' } },
];
export const countriesData: CodeListData = {
  name: 'countries',
  codes: countries,
};
export const countriesKey = 'c2b0e032-8800-4b60-9e9e-ffe4197bcbad';

export const codeListMap: CodeListMap = new Map<string, CodeListData>([
  [coloursKey, coloursData],
  [fruitsKey, fruitsData],
  [countriesKey, countriesData],
]);
