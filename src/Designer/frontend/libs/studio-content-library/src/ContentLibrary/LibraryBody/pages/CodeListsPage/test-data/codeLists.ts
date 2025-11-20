import type { CodeListData } from '../../../../../types/CodeListData';
import type { CodeList } from '../../../../../types/CodeList';

export const colours: CodeList = [
  { value: 'red', label: { nb: 'Rød', en: 'Red' } },
  { value: 'green', label: { nb: 'Grønn', en: 'Green' } },
  { value: 'blue', label: { nb: 'Blå', en: 'Blue' } },
];
export const coloursData: CodeListData = {
  name: 'colours',
  codes: colours,
};

export const fruits: CodeList = [
  { value: 'apple', label: { nb: 'Eple', en: 'Apple' } },
  { value: 'banana', label: { nb: 'Banan', en: 'Banana' } },
  { value: 'cherry', label: { nb: 'Kirsebær', en: 'Cherry' } },
];
export const fruitsData: CodeListData = {
  name: 'fruits',
  codes: fruits,
};

export const countries: CodeList = [
  { value: 'norway', label: { nb: 'Norge', en: 'Norway' } },
  { value: 'sweden', label: { nb: 'Sverige', en: 'Sweden' } },
  { value: 'denmark', label: { nb: 'Danmark', en: 'Denmark' } },
];
export const countriesData: CodeListData = {
  name: 'countries',
  codes: countries,
};

export const codeLists: CodeListData[] = [coloursData, fruitsData, countriesData];
