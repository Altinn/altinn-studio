import '@testing-library/cypress/add-commands';
import 'cypress-wait-until';
import 'cypress-axe';
import 'cypress-plugin-tab';
import 'cypress-network-idle';
import 'test/e2e/support/custom';
import 'test/e2e/support/start-app-instance';
import 'test/e2e/support/auth';
import 'test/e2e/support/navigation';
import 'test/e2e/support/formFiller';
import '@percy/cypress';

import { chaiExtensions } from 'test/e2e/support/chai-extensions';

before(() => {
  chai.use(chaiExtensions);
});
