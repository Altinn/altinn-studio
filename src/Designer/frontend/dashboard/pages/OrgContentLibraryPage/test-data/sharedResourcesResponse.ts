import type { GetSharedResourcesResponse } from 'app-shared/types/api/GetSharedResourcesResponse';
import { codeLists } from './codeLists';
import { btoaUTF8 } from '../utils';

const animalsFileContent = btoaUTF8(JSON.stringify({ codes: codeLists.animals }));
const vehiclesFileContent = btoaUTF8(JSON.stringify({ codes: codeLists.vehicles }));

export const sharedResourcesResponse: GetSharedResourcesResponse = {
  files: [
    {
      path: 'CodeLists/animals.json',
      contentType: 'application/json',
      content: animalsFileContent,
    },
    {
      path: 'CodeLists/vehicles.json',
      contentType: 'application/json',
      content: vehiclesFileContent,
    },
  ],
  commitSha: 'abc123def456ghi789jkl012mno345pqr678stu9',
};

export const sharedResourcesResponseWithProblem: GetSharedResourcesResponse = {
  files: [
    {
      path: 'CodeLists/animals.json',
      contentType: 'application/json',
      content: animalsFileContent,
    },
    {
      path: 'CodeLists/vehicles.json',
      contentType: 'application/json',
      problem: {
        title: 'Invalid JSON',
        detail: 'Could not parse JSON content',
        status: 400,
      },
    },
  ],
  commitSha: 'abc123def456ghi789jkl012mno345pqr678stu9',
};

export const sharedResourcesResponseWithInvalidFormat: GetSharedResourcesResponse = {
  files: [
    {
      path: 'CodeLists/animals.json',
      contentType: 'application/json',
      content: animalsFileContent,
    },
    {
      path: 'CodeLists/invalid.json',
      contentType: 'application/json',
      content: btoa(JSON.stringify({ notCodes: 'invalid' })),
    },
  ],
  commitSha: 'abc123def456ghi789jkl012mno345pqr678stu9',
};
