import App from '../app';
import { Selector, t, ClientFunction } from 'testcafe';
import axeCheck from 'axe-testcafe';
import RunTimePage from '../page-objects/runTimePage';
import { AutoTestUser } from '../TestData';
import DesignerPage from '../page-objects/designerPage';
import DashBoard from '../page-objects/DashboardPage';

let app = new App();
let runtime = new RunTimePage();
let designerPage = new DesignerPage();
let dashboard = new DashBoard();

const getLocation = ClientFunction(() => document.location.href);

fixture.skip('WCAG 2.0 tests for Altinn Studio')
	.page(app.baseUrl)
	.beforeEach(async t => {
		await t
			.useRole(AutoTestUser)
			.resizeWindow(1536, 864)
	})


	test('Accessibility testing for deployment to test environment page', async t => {
		await t
			.navigateTo(app.baseUrl + 'designer/ttd/wcag#/test')
			.click(designerPage.testeNavigationTab)
			.hover(designerPage.leftDrawerMenu)
			.click(designerPage.testeLeftMenuItems[1])
		const axeOptions = { runOnly: { 'type': 'tag', values: ['wcag2a', 'wcag2aa'] } };
		const { error, violations } = await axeCheck(t, axeOptions);
		await t.expect(violations.length === 0).ok(createReport(violations));	
	});

	test('Accessibility testing for designer page', async t => {
		await t
		  .navigateTo(app.baseUrl + 'designer/ttd/wcag#/test')
		const axeOptions = { runOnly: { 'type': 'tag', values: ['wcag2a', 'wcag2aa'] } };
		const { error, violations } = await axeCheck(t, axeOptions);
		await t.expect(violations.length === 0).ok(createReport(violations));	
	});

	test('Om tab accessibility test', async t => {
		await t
			.navigateTo(app.baseUrl + 'designer/ttd/wcag#/aboutservice')
			.click(designerPage.omNavigationTab)
			.hover(designerPage.leftDrawerMenu)
			.expect(designerPage.omLeftMenuItems[0].visible).ok()
			.expect(designerPage.omLeftMenuItems[1].visible).ok()
			.expect(designerPage.omLeftMenuItems[2].visible).ok()
			.expect(designerPage.omLeftMenuItems[3].visible).ok()
			.expect(designerPage.omLeftMenuItems[4].visible).ok()
			.expect(designerPage.omLeftMenuItems[5].visible).ok()
		const axeOptions = { runOnly: { 'type': 'tag', values: ['wcag2a', 'wcag2aa'] } };
		const { error, violations } = await axeCheck(t, axeOptions);
		await t.expect(violations.length === 0).ok(createReport(violations));	
	});

	test('Lage tab accessibility test', async t => {
		await t
			.navigateTo(app.baseUrl + 'designer/ttd/wcag#/aboutservice')
			.click(designerPage.lageNavigationTab)
			.hover(designerPage.leftDrawerMenu)
			.expect(designerPage.lageLeftMenuItems[0].visible).ok()
			.expect(designerPage.lageLeftMenuItems[1].visible).ok()
			.expect(designerPage.lageLeftMenuItems[2].visible).ok()
			.expect(designerPage.lageLeftMenuItems[3].visible).ok()
			.expect(designerPage.lageLeftMenuItems[4].visible).ok()
		const axeOptions = { runOnly: { 'type': 'tag', values: ['wcag2a', 'wcag2aa'] } };
		const { error, violations } = await axeCheck(t, axeOptions);
		await t.expect(violations.length === 0).ok(createReport(violations));	
	});

	test('Språk tab accessibility test', async t => {
		await t
			.navigateTo(app.baseUrl + 'designer/ttd/wcag#/aboutservice')
			.click(designerPage.spraakNavigationTab)
			.hover(designerPage.leftDrawerMenu)
			.expect(designerPage.spraakLeftMenuItems[0].visible).ok()
			.expect(designerPage.spraakLeftMenuItems[1].visible).ok()
		const axeOptions = { runOnly: { 'type': 'tag', values: ['wcag2a', 'wcag2aa'] } };
		const { error, violations } = await axeCheck(t, axeOptions);
		await t.expect(violations.length === 0).ok(createReport(violations));	
	});

	test('Publisere tab accessibility test', async t => {
		await t
			.navigateTo(app.baseUrl + 'designer/ttd/wcag#/aboutservice')
			.click(designerPage.publisereNavigationTab)
			.hover(designerPage.leftDrawerMenu)
			.expect(getLocation()).contains('publish');
		const axeOptions = { runOnly: { 'type': 'tag', values: ['wcag2a', 'wcag2aa'] } };
		const { error, violations } = await axeCheck(t, axeOptions);
		await t.expect(violations.length === 0).ok(createReport(violations));	
	});

	test('Accessibility testing for dashboard page', async t => {
		await t
			.navigateTo(app.baseUrl)
		const axeOptions = { runOnly: { 'type': 'tag', values: ['wcag2a', 'wcag2aa'] } };
		const { error, violations } = await axeCheck(t, axeOptions);
		await t.expect(violations.length === 0).ok(createReport(violations));
	});