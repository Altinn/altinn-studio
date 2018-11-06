import { Selector, t } from 'testcafe';
import App from '../app';

let app = new App();

fixture('UX react app tests')
  .page(app.baseUrl)
//.beforeEach()

test('Repeating groups', async () => {
  await t
    .Click();
});