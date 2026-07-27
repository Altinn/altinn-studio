import type { SharedResourcesResponse } from 'app-shared/types/api/SharedResourcesResponse';
import { codeListsBinary } from './codeLists';

export const sharedResourcesResponse: SharedResourcesResponse = {
  files: [
    {
      path: 'CodeLists/animals.json',
      contentType: 'application/json',
      content: codeListsBinary.animals,
    },
    {
      path: 'CodeLists/vehicles.json',
      contentType: 'application/json',
      content: codeListsBinary.vehicles,
    },
  ],
  commitSha: 'abc123def456ghi789jkl012mno345pqr678stu9',
};

export const sharedResourcesResponseWithProblem: SharedResourcesResponse = {
  files: [
    {
      path: 'CodeLists/animals.json',
      contentType: 'application/json',
      content: codeListsBinary.animals,
    },
    {
      path: 'CodeLists/vehicles.json',
      contentType: 'application/json',
      problem: {
        title: 'Error retrieving file',
        detail: 'An error occurred when trying to retrieve the file.',
        status: 500,
      },
    },
  ],
  commitSha: 'abc123def456ghi789jkl012mno345pqr678stu9',
};

export const sharedResourcesResponseWithInvalidFormat: SharedResourcesResponse = {
  files: [
    {
      path: 'CodeLists/animals.json',
      contentType: 'application/json',
      content: codeListsBinary.animals,
    },
    {
      path: 'CodeLists/invalid.json',
      contentType: 'application/json',
      content: btoa(JSON.stringify({ notCodes: 'invalid' })),
    },
  ],
  commitSha: 'abc123def456ghi789jkl012mno345pqr678stu9',
};
