import { test } from '../../extenders/testExtend';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
// Test nr. 2 is dependent on test 1, and therefore is "serial" important
test.describe.configure({ mode: 'serial' });

test('That it is possible to login with valid user credentials, and then log out again', async ({
  page,
}): Promise<void> => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  // As we are logged in already, we need to start with login out
  await dashboardPage.loadDashboardPage();

  await dashboardPage.verifyDashboardPage();

  await dashboardPage.clickOnHeaderAvatar();
  await dashboardPage.clickOnLogOutButton();

  await loginPage.verifyLoginPage();
});

test('That it is not possible to login with invalid credentials', async ({
  page,
  locale,
}): Promise<void> => {
  const loginPage = new LoginPage(page);
  console.log('locale', locale);

  await loginPage.goToAltinnLoginPage();
  await loginPage.goToGiteaLoginPage();

  // Gitea login page is in Norwegian locally, but english in dev and prod
  const isEnglish: boolean = locale === 'en';

  await loginPage.writeUsername(process.env.PLAYWRIGHT_USER, isEnglish);
  await loginPage.writePassword('123', isEnglish);

  await loginPage.clickLoginButton(isEnglish);
  await loginPage.checkThatErrorMessageIsVisible();
});
