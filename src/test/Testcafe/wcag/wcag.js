import App from '../app';
import { t } from 'testcafe';
import { axeCheck, createReport } from 'axe-testcafe';
import { AutoTestUser } from '../TestData';
import DashBoard from '../page-objects/DashboardPage';

let app = new App();
let dashboard = new DashBoard();

fixture('WCAG 2.0 tests for Altinn Studio')
  .page(app.baseUrl)
  .beforeEach(async (t) => {
    await t.useRole(AutoTestUser).maximizeWindow();
  });

test('Accessibility testing for deployment page', async (t) => {
  await t.navigateTo(app.baseUrl + 'designer/ttd/wcag#/deploy');

  const axeContext = { exclude: [['img']] };
  const axeOptions = { runOnly: ['wcag2a', 'wcag2aa'] };
  const { violations } = await axeCheck(t, axeContext, axeOptions);
  await t.expect(violations.length === 0).ok(createReport(violations));
});

test('Accessibility testing for designer page', async (t) => {
  await t.navigateTo(app.baseUrl + 'designer/ttd/wcag#/test');

  const axeContext = { exclude: [['img']] };
  const axeOptions = { runOnly: ['wcag2a', 'wcag2aa'] };
  const { violations } = await axeCheck(t, axeContext, axeOptions);
  await t.expect(violations.length === 0).ok(createReport(violations));
});

test('Om tab accessibility test', async (t) => {
  await t.navigateTo(app.baseUrl + 'designer/ttd/wcag#/about');

  const axeContext = { exclude: [['img']] };
  const axeOptions = { runOnly: ['wcag2a', 'wcag2aa'] };
  const { violations } = await axeCheck(t, axeContext, axeOptions);
  await t.expect(violations.length === 0).ok(createReport(violations));
});

test('Lage tab accessibility test', async (t) => {
  await t.navigateTo(app.baseUrl + 'designer/ttd/wcag#/ui-editor');

  const axeContext = { exclude: [['img']] };
  const axeOptions = { runOnly: ['wcag2a', 'wcag2aa'] };
  const { violations } = await axeCheck(t, axeContext, axeOptions);
  await t.expect(violations.length === 0).ok(createReport(violations));
});

test('Språk tab accessibility test', async (t) => {
  await t.navigateTo(app.baseUrl + 'designer/ttd/wcag#/texts');

  const axeContext = { exclude: [['img']] };
  const axeOptions = { runOnly: ['wcag2a', 'wcag2aa'] };
  const { violations } = await axeCheck(t, axeContext, axeOptions);
  await t.expect(violations.length === 0).ok(createReport(violations));
});

test('Accessibility testing for dashboard page', async (t) => {
  await t.navigateTo(app.baseUrl);

  const axeContext = { exclude: [['img']] };
  const axeOptions = { runOnly: ['wcag2a', 'wcag2aa'] };
  const { violations } = await axeCheck(t, axeContext, axeOptions);
  await t.expect(violations.length === 0).ok(createReport(violations));
});

test('Accessibility testing for new app modal', async (t) => {
  await t
    .navigateTo(app.baseUrl)
    .click(dashboard.newAppButton)
    .expect(dashboard.createAppButton.visible)
    .ok({ timeout: 60000 });

  const axeContext = { exclude: [['img']] };
  const axeOptions = { runOnly: ['wcag2a', 'wcag2aa'] };
  const { violations } = await axeCheck(t, axeContext, axeOptions);
  await t.expect(violations.length === 0).ok(createReport(violations));
});
