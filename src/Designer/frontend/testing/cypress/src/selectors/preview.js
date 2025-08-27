import * as texts from 'src/Designer/frontend/language/src/nb.json';
import { TopBarMenu } from '../../../../packages/shared/src/enums/TopBarMenu';

export const preview = {
  getBackToEditorButton: () =>
    cy.findByRole('link', { name: texts[TopBarMenu.PreviewBackToEditing] }),
};
