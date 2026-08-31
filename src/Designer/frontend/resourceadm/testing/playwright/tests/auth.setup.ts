import { test as setup } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

setup('authenticate user', async ({ page }): Promise<void> => {
  const loginPage = new LoginPage(page);

  await loginPage.goToAltinnLoginPage();
  await loginPage.loginViaFakeAnsattporten();
  await loginPage.addSessionToSharableStorage();
});
