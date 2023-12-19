import * as texts from '@altinn-studio/language/src/nb.json';

export const settingsTab = {
  getHeader: () => cy.findByRole('heading', { name: texts['settings_modal.setup_tab_heading'] }),
  getTab: () => cy.findByText(texts['settings_modal.setup_tab_heading']),
  getAutoDelete: () =>
    cy.findByText(texts['settings_modal.setup_tab_switch_autoDeleteOnProcessEnd']),
  getHideInInbox: () =>
    cy.findByText(
      texts['settings_modal.setup_tab_switch_messageBoxConfig_hideSettings_hideAlways'],
    ),
  getEnableCopyInstance: () =>
    cy.findByText(texts['settings_modal.setup_tab_switch_copyInstanceSettings_enabled']),
  getShowStartedInstances: () =>
    cy.findByText(texts['settings_modal.setup_tab_switch_onEntry_show']),
};
