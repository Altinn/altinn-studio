import { test } from '../../extenders/testExtend';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
test.describe.configure({ mode: 'serial' });

test('That it is possible to login with valid user credentials, and then log out again', async ({
  page,
}): Promise<void> => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.loadDashboardPage();

  await dashboardPage.verifyDashboardPage();

  await dashboardPage.clickOnHeaderAvatar();
  await dashboardPage.clickOnLogOutButton();

  await loginPage.verifyLoginPage();
});

test('That it is not possible to login with invalid credentials', async ({
  page,
}): Promise<void> => {
  const loginPage = new LoginPage(page);

  await loginPage.goToAltinnLoginPage();
  await loginPage.goToGiteaLoginPage();

  await loginPage.writeUsername(process.env.PLAYWRIGHT_USER);
  await loginPage.writePassword('123');

  await loginPage.clickLoginButton();
  await loginPage.checkThatErrorMessageIsVisible();
});
