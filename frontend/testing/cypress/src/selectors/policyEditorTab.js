import * as texts from '@altinn-studio/language/src/nb.json';

export const policyEditorTab = {
  getHeader: () => cy.findByRole('heading', { name: texts['settings_modal.policy_tab_heading'] }),
  getTab: () => cy.findByText(texts['settings_modal.policy_tab_heading']),
  getSecurityLevelSelect: () =>
    cy.findByRole('combobox', { name: texts['policy_editor.select_auth_level_label'] }),
};
