import { CG, Variant } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const TEXTAREA_SUMMARY_PROPS = new CG.obj()
  .extends(CG.common('ISummaryOverridesCommon'))
  .optional()
  .setTitle('Summary properties')
  .setDescription('Properties for how to display the summary of the component');

export const Config = new CG.component({
  category: CompCategory.Form,
  rendersWithLabel: true,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
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
  .addProperty(new CG.prop('summaryProps', TEXTAREA_SUMMARY_PROPS).onlyIn(Variant.Internal));
