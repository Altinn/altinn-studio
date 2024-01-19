import { test as setup } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

setup('authenticate user', async ({ page }): Promise<void> => {
  const loginPage = new LoginPage(page);

  await loginPage.goToAltinnLoginPage();
  await loginPage.goToGiteaLoginPage();
  await loginPage.writeUsername(process.env.PLAYWRIGHT_USER);
  await loginPage.writePassword(process.env.PLAYWRIGHT_PASS);
  await loginPage.clickLoginButton();
  await loginPage.confirmSuccessfulLogin();
  await new Promise((resolve) =>
    setTimeout(() => {
      return resolve('');
    }, 5000),
  );
  await loginPage.addSessionToSharableStorage();
});
