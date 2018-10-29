import { Selector, t } from 'testcafe';
import App from '../app';
import Page from '../page-objects/page';

app = new App();
page = new Page();



fixture('UX react app tests')
    .page(app.basepage)
    .beforeEach()

test('Repeating groups', () => {
    await t
        .Click()

