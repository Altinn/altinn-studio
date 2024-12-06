import { test as setup } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

setup('authenticate user', async ({ page }): Promise<void> => {
  const loginPage = new LoginPage(page);

  await loginPage.goToAltinnLoginPage();
  await loginPage.goToGiteaLoginPage();
  await loginPage.writeUsername(process.env.PLAYWRIGHT_USER);
  await loginPage.writePassword(process.env.PLAYWRIGHT_PASS);
  await loginPage.pressEnterInPasswordField();
  await loginPage.clickAuthorizeButtonIfLoaded();
  await loginPage.confirmSuccessfulLogin();
  await loginPage.addSessionToSharableStorage();
});
