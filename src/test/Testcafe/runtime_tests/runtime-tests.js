import App from '../app';
import { Selector, t } from 'testcafe';
import axeCheck from 'axe-testcafe';
import CommonPage from '../page-objects/common';
import DashBoard from '../page-objects/DashboardPage';
import LoginPage from '../page-objects/loginPage';
import RunTimePage from '../page-objects/runTimePage';
import DesignerPage from '../page-objects/designerPage';
import TestData from '../TestData';

let app = new App();
let dash = new DashBoard();
let loginPage = new LoginPage();
let common = new CommonPage();
let runtime = new RunTimePage();
let designer = new DesignerPage();
let runtimeUser = new TestData('AutoTest', 'automatictestaltinn@brreg.no', 'test123', 'basic');


fixture('Regression tests of services in runtime')
  .page(app.baseUrl)
  .beforeEach(async t => {
    //Testdata and other testing context
    t.ctx.serviceName = "runtime";
    await common.login(runtimeUser.userEmail, runtimeUser.password, loginPage);
  })


test('Instantiate a service in runtime', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/runtime#/aboutservice')
    .click(designer.testeNavigationTab)
    .click(runtime.openManualTestWindow)
    .click(runtime.testUsers[0])
    .click(runtime.startNewButton)
})

test('Upload files using file component in SBL', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/file_component#/aboutservice')
    .click(designer.testeNavigationTab)
    .click(runtime.openManualTestWindow)
    .click(runtime.testUsers[0])
    .click(runtime.startNewButton)
    .setFilesToUpload(runtime.fileDropComponent, '../testdata/melding.xsd')
    .expect(runtime.fileDeleteButton.visible).ok()
    .click(runtime.fileDeleteButton)
    .expect(runtime.fileDropComponent.exists).ok()
    .setFilesToUpload(runtime.fileDropComponent, '../testdata/melding.xsd')
    .expect(runtime.fileListBox.textContent).contains("Ferdig lastet")
})

test('Validations when uploading file', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/file_component_validations#/aboutservice')
    .click(designer.testeNavigationTab)
    .click(runtime.openManualTestWindow)
    .click(runtime.testUsers[0])
    .click(runtime.startNewButton)
    .setFilesToUpload(runtime.fileDropComponent, '../testdata/test_file_morethan_1mb.txt')
    .expect(runtime.errorMessage).ok();
  await t.eval(() => location.reload(true))
  await t
    .setFilesToUpload(runtime.fileDropComponent, '../testdata/test_file_pdf.pdf')
    .expect(runtime.errorMessage).ok()
})


test('Read-only components test in runtime', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/locked_view#/aboutservice')
    .click(designer.testeNavigationTab)
    .click(runtime.openManualTestWindow)
    .click(runtime.testUsers[0])
    .click(runtime.startNewButton)
})

test('axe UI accessibility test for runtime', async t => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/runtime#/aboutservice')
    .click(designer.testeNavigationTab)
    .click(runtime.openManualTestWindow)
    .click(runtime.testUsers[0])
    .click(runtime.startNewButton)
  axeCheck(t);
});