import type { CodeListDataNew } from 'app-shared/types/CodeListDataNew';
import type { CodeListsNewResponse } from 'app-shared/types/api/CodeListsNewResponse';

const animals: CodeListDataNew = {
  title: 'animals',
  codeList: {
    codes: [
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
    ],
  },
  hasError: false,
};

const vehicles: CodeListDataNew = {
  title: 'vehicles',
  codeList: {
    codes: [
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
    ],
  },
  hasError: false,
};

const codeListWrappers: CodeListDataNew[] = [animals, vehicles];

export const codeListsNewResponse: CodeListsNewResponse = {
  codeListWrappers,
  commitSha: 'abc123def456ghi789jkl012mno345pqr678stu9',
};
