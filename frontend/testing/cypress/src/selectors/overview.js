import * as texts from '@altinn-studio/language/src/nb.json';

export const overview = {
  getHeader: (appName) => cy.findByRole('heading', { name: appName }),
};
