import App from '../app';
import { Selector, t } from 'testcafe';
import axeCheck from 'axe-testcafe';
import RunTimePage from '../page-objects/runTimePage';
import DesignerPage from '../page-objects/designerPage';
import { AutoTestUser } from '../TestData';


let app = new App();
let runtime = new RunTimePage();
let designer = new DesignerPage();

fixture('Regression tests of services in runtime')
  .page(app.baseUrl)
  .beforeEach(async t => {
    //Testdata and other testing context
    t.ctx.serviceName = "runtime";
    t.ctx.tjenesteOppdatert = "Tjenesten din er oppdatert til siste versjon";
    t.ctx.instanceID = "44b3b0f2-b630-4c65-9a63-3cc5f50053c6";
    t.ctx.formFillComplete = "Skjemaet er nå fullført og sendt inn.";
    await t
      .useRole(AutoTestUser)
      .resizeWindow(1280, 610)
  })


test('Instantiate a service in runtime', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/runtime#/test')
    .switchToIframe(runtime.testBrukerIframe)
    .expect(runtime.testUsers[0].exists).ok()
    .hover(runtime.testUsers[0])
    .click(runtime.testUsers[0])
    .expect(runtime.startNewButton.exists).ok()
    .click(runtime.startNewButton)
    .switchToMainWindow()
    .expect(runtime.testUserHeader[0].exists).ok()
})

test('Direct link navigation to runtime', async () => {
  await t
    .navigateTo(app.baseUrl + '/runtime/AutoTest/runtime')
    .expect(runtime.fileDropComponent.exists).notOk()
    .navigateTo(app.baseUrl + 'runtime/AutoTest/runtime#' + t.ctx.instanceID + '#/Preview')
    .expect(runtime.fileDropComponent.exists).notOk()
})


test('Upload files using file component in SBL', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/file_component#/test')
    .switchToIframe(runtime.testBrukerIframe)
    .click(runtime.testUsers[0])
    .expect(runtime.startNewButton.exists).ok()
    .click(runtime.startNewButton)
    .switchToMainWindow()
    .expect(runtime.testUserHeader[0].exists).ok()
    .setFilesToUpload(runtime.fileDropComponent, '../testdata/melding.xsd')
    .expect(runtime.fileDeleteButton.visible).ok()
    .click(runtime.fileDeleteButton)
    .expect(runtime.fileDropComponent.exists).ok()
    .setFilesToUpload(runtime.fileDropComponent, '../testdata/melding.xsd')
    .expect(runtime.fileListBox.textContent).contains("Ferdig lastet")
})

test('Validations when uploading file', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/file_component_validations#/test')
    .switchToIframe(runtime.testBrukerIframe)
    .click(runtime.testUsers[0])
    .expect(runtime.startNewButton.exists).ok()
    .click(runtime.startNewButton)
    .switchToMainWindow()
    .expect(runtime.testUserHeader[0].exists).ok()
    .setFilesToUpload(runtime.fileDropComponent, '../testdata/test_file_morethan_1mb.txt')
    .expect(runtime.errorMessage).ok();
  await t.eval(() => location.reload(true))
  await t
    .setFilesToUpload(runtime.fileDropComponent, '../testdata/test_file_pdf.pdf')
    .expect(runtime.errorMessage).ok()
})


test('Read-only components test in runtime', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/locked_view#/test')
    .switchToIframe(runtime.testBrukerIframe)
    .click(runtime.testUsers[0])
    .expect(runtime.startNewButton.exists).ok()
    .click(runtime.startNewButton)
    .switchToMainWindow()
    .expect(runtime.testUserHeader[0].exists).ok()
})

test('Fill out, save, and submit a form', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/formfill#/test')
    .switchToIframe(runtime.testBrukerIframe)
    .expect(runtime.testUsers[0].exists).ok()
    .hover(runtime.testUsers[0])
    .click(runtime.testUsers[0])
    .expect(runtime.startNewButton.exists).ok()
    .click(runtime.startNewButton)
    .switchToMainWindow()
    .expect(runtime.testUserHeader[0].exists).ok()
    .typeText(runtime.inputButton, "10101010101") //fødselsnummer input
    .pressKey("tab")
    .pressKey("tab")
    .expect(runtime.saveButton.exists).ok()
    .setFilesToUpload(runtime.fileDropComponent, '../testdata/melding.xsd')
    .expect(runtime.fileDeleteButton.visible).ok()
    .click(runtime.saveButton)
    .click(runtime.sendInnButton)
    .expect(runtime.workflowSubmit.exists).ok()
    .expect(runtime.workflowSubmit.visible).ok()
    .click(runtime.workflowSubmit)
    .expect(Selector("p").withText(t.ctx.formFillComplete).visible).ok()
})

test('axe UI accessibility test for runtime', async t => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/runtime#/test')
    //.click(designer.testeNavigationTab)
    .switchToIframe(runtime.testBrukerIframe)
    .expect(runtime.testUsers[0].exists).ok()
    .hover(runtime.testUsers[0])
    .click(runtime.testUsers[0])
    .expect(runtime.startNewButton.exists).ok()
    .click(runtime.startNewButton)
    .switchToMainWindow()
    .expect(runtime.testUserHeader[0].exists).ok()
  axeCheck(t);
});