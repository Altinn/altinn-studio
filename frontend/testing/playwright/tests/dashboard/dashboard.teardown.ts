import { expect } from '@playwright/test';
import { Gitea } from '../../helpers/Gitea';
import { test } from '../../extenders/testExtend';

test('Delete the test app', async ({ request, testAppName }) => {
  const gitea = new Gitea();
  const appsToDelete: string[] = [testAppName, `${testAppName}2`];

  for (const app of appsToDelete) {
    const response = await request.delete(gitea.getDeleteAppEndpoint({ app }));
    expect(response.ok()).toBeTruthy();
  }
});
