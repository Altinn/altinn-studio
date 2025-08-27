import * as texts from '@altinn-studio/language/src/nb.json';
import { TopBarMenu } from '../../../../packages/shared/src/enums/TopBarMenu';

export const preview = {
  getBackToEditorButton: () =>
    cy.findByRole('link', { name: texts[TopBarMenu.PreviewBackToEditing] }),
};
