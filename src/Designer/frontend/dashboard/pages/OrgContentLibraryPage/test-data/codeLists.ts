import type { CodeListItem } from '@studio/components';

const animals: CodeListItem[] = [
  {
    value: 'cat',
    label: { nb: 'Katt', nn: 'Katt', en: 'Cat' },
  },
  {
    value: 'dog',
    label: { nb: 'Hund', nn: 'Hund', en: 'Dog' },
  },
  {
    value: 'rabbit',
    label: { nb: 'Kanin', nn: 'Kanin', en: 'Rabbit' },
  },
];

const vehicles: CodeListItem[] = [
  {
    value: 'car',
    label: { nb: 'Bil', nn: 'Bil', en: 'Car' },
  },
  {
    value: 'bike',
    label: { nb: 'Sykkel', nn: 'Sykkel', en: 'Bike' },
  },
  {
    value: 'boat',
    label: { nb: 'Båt', nn: 'Båt', en: 'Boat' },
  },
];

export const codeLists = { animals, vehicles } satisfies { [key: string]: CodeListItem[] };
