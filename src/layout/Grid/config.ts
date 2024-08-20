import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { GridRowsPlugin } from 'src/layout/Grid/GridRowsPlugin';

export const Config = new CG.component({
  category: CompCategory.Container,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addPlugin(new GridRowsPlugin())
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
