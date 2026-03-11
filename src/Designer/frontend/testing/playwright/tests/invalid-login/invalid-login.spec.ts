import { test } from '../../extenders/testExtend';
import { LoginPage } from '../../pages/LoginPage';
import { expect } from '@playwright/test';
import { Language } from '../../enum/Language';
import { waitFor } from '@testing-library/dom';

test('It is not possible to log in with invalid credentials', async ({ page }): Promise<void> => {
  test.skip(
    process.env.STUDIO_OIDC_ENABLED === 'true',
    'No invalid credentials flow with fake-ansattporten',
  );

  const loginPage = new LoginPage(page);

  await loginPage.goToAltinnLoginPage();
  await loginPage.goToGiteaLoginPage();

  const lang = await loginPage.getLanguage();
  if (lang !== Language.Norwegian) {
    await loginPage.clickOnLanguageMenu();
    await loginPage.clickOnNorwegianLanguageOption();
    await waitFor(() => expect(loginPage.getLanguage()).toBe(Language.Norwegian));
  }

  await loginPage.writeUsername(process.env.PLAYWRIGHT_USER);
  await loginPage.writePassword('123');

  await loginPage.clickLoginButton();
  await loginPage.checkThatErrorMessageIsVisible();
});
