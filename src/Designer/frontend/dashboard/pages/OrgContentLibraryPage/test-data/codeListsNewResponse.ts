import type { CodeListDataNew } from 'app-shared/types/CodeListDataNew';
import type { CodeListsNewResponse } from 'app-shared/types/api/CodeListsNewResponse';
import { codeLists } from './codeLists';

const animalsData: CodeListDataNew = {
  title: 'animals' satisfies keyof typeof codeLists,
  codeList: {
    codes: codeLists.animals,
  },
  hasError: false,
};

const vehiclesData: CodeListDataNew = {
  title: 'vehicles' satisfies keyof typeof codeLists,
  codeList: {
    codes: codeLists.vehicles,
  },
  hasError: false,
};

const codeListWrappers: CodeListDataNew[] = [animalsData, vehiclesData];

export const codeListsNewResponse: CodeListsNewResponse = {
  codeListWrappers,
  commitSha: 'abc123def456ghi789jkl012mno345pqr678stu9',
};
