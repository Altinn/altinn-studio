import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const INPUT_SUMMARY_OVERRIDE_PROPS = new CG.obj()
  .extends(CG.common('ISummaryOverridesCommon'))
  .optional()
  .setTitle('Summary properties')
  .setDescription('Properties for how to display the summary of the component')
  .exportAs('InputSummaryOverrideProps');

export const Config = new CG.component({
  category: CompCategory.Form,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: true,
  },
})
  .addTextResource(
    new CG.trb({
      name: 'prefix',
      title: 'Prefix',
      description: 'Prefix shown before the input field',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'suffix',
      title: 'Suffix',
      description: 'Suffix shown after the input field',
    }),
  )
  .addDataModelBinding(CG.common('IDataModelBindingsSimple'))
  .addProperty(new CG.prop('saveWhileTyping', CG.common('SaveWhileTyping').optional({ default: true })))
  .addProperty(new CG.prop('formatting', CG.common('IFormatting').optional()))
  .addProperty(
    new CG.prop(
      'variant',
      new CG.enum('text', 'search')
        .optional({ default: 'text' })
        .setTitle('Input variant')
        .setDescription('The variant of the input field (text or search).'),
    ),
  )
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
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
