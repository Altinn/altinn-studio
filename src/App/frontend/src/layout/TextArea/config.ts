import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addDataModelBinding(CG.common('IDataModelBindingsSimple'))
  .addProperty(new CG.prop('saveWhileTyping', CG.common('SaveWhileTyping').optional({ default: true })))
  .addProperty(new CG.prop('autocomplete', CG.common('HTMLAutoCompleteValues').optional()))
  .addProperty(
    new CG.prop(
      'maxLength',
      new CG.int()
        .optional()
        .setTitle('Max length')
        .setDescription(
          'Max length of the input field. Will add a counter to let the user know how many characters are left.',
        ),
    ),
  )
  .addSummaryOverrides()
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
