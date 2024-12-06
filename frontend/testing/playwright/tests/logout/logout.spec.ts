import { test } from '../../extenders/testExtend';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';

test('It is possible to log out', async ({ page }): Promise<void> => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await dashboardPage.loadDashboardPage();
  await dashboardPage.verifyDashboardPage();

  await dashboardPage.clickOnHeaderAvatar();
  await dashboardPage.clickOnLogOutButton();

  await loginPage.verifyLoginPage();
});
