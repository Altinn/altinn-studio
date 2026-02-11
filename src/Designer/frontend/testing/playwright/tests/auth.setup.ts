import { test as setup } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

setup('authenticate user', async ({ page }): Promise<void> => {
  const loginPage = new LoginPage(page);

  await loginPage.goToAltinnLoginPage();
  await loginPage.goToGiteaLoginPage();
  await loginPage.writeUsername(process.env.PLAYWRIGHT_USER);
  await loginPage.writePassword(process.env.PLAYWRIGHT_PASS);
  await loginPage.clickLoginButton();
  await loginPage.clickAuthorizeButtonIfLoaded();
  await loginPage.confirmSuccessfulLogin();

  const consentCookieValue = JSON.stringify({
    preferences: { analytics: false, sessionRecording: false },
    timestamp: Date.now(),
  });

  await page.context().addCookies([
    {
      name: 'altinn-studio-consent',
      value: encodeURIComponent(consentCookieValue),
      domain: new URL(process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://studio.localhost').hostname,
      path: '/',
      sameSite: 'Lax',
    },
  ]);

  await loginPage.addSessionToSharableStorage();
});
