import { expect } from '@playwright/test';
import { test } from '../../playwright.config';

import { Gitea } from '../../helpers/Gitea';

test('should teardown simple-schema-app test', async ({ request, testAppName }) => {
  const gitea = new Gitea();
  const response = await request.delete(gitea.getDeleteAppEndpoint({ app: testAppName }));
  expect(response.ok()).toBeTruthy();
});
