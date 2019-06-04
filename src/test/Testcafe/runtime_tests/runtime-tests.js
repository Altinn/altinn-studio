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
    await t.useRole(AutoTestUser);
  })


test('Instantiate a service in runtime', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/runtime#/uieditor')
    .maximizeWindow()
    .expect(designer.hentEndringer.exists).ok()
    .click(designer.hentEndringer)
    .expect(Selector("h3").withText(t.ctx.tjenesteOppdatert).exists).ok()
    .click(designer.testeNavigationTab)
    .click(designer.testeNavigationTab)
    .switchToIframe(runtime.testBrukerIframe)
    .expect(runtime.testUsers[0].visible).ok()
    .hover(runtime.testUsers[0])
    .click(runtime.testUsers[0])
    .expect(runtime.startNewButton.visible).ok()
    .click(runtime.startNewButton)
})

test('Upload files using file component in SBL', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/file_component#/aboutservice')
    .click(designer.testeNavigationTab)
    .switchToIframe(runtime.testBrukerIframe)
    .click(runtime.testUsers[0])
    .expect(runtime.startNewButton.visible).ok()
    .click(runtime.startNewButton)
    .switchToMainWindow()
    .setFilesToUpload(runtime.fileDropComponent, '../testdata/melding.xsd')
    .expect(runtime.fileDeleteButton.visible).ok()
    .click(runtime.fileDeleteButton)
    .expect(runtime.fileDropComponent.exists).ok()
    .setFilesToUpload(runtime.fileDropComponent, '../testdata/melding.xsd')
    .expect(runtime.fileListBox.textContent).contains("Ferdig lastet")
})

test('Validations when uploading file', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/file_component_validations#/uieditor')
    .maximizeWindow()
    .click(designer.testeNavigationTab)
    .switchToIframe(runtime.testBrukerIframe)
    .click(runtime.testUsers[0])
    .expect(runtime.startNewButton.visible).ok()
    .click(runtime.startNewButton)
    .switchToMainWindow()
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
    .switchToIframe(runtime.testBrukerIframe)
    .click(runtime.testUsers[1])
    .expect(runtime.startNewButton.visible).ok()
    .click(runtime.startNewButton)
    .switchToMainWindow()
})

test.skip('axe UI accessibility test for runtime', async t => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/runtime#/aboutservice')
    .click(designer.testeNavigationTab)
    .switchToIframe(runtime.testBrukerIframe)
    .click(runtime.testUsers[1])
    .expect(runtime.startNewButton.visible).ok()
    .click(runtime.startNewButton)
    .switchToMainWindow()
  axeCheck(t);
});