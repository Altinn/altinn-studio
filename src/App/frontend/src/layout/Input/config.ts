import { EXTERNAL_INPUT_TYPE, INPUT_AUTO_COMPLETE } from 'src/app-components/Input/constants';
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
      new CG.enum(...EXTERNAL_INPUT_TYPE)
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
  .addProperty(
    new CG.prop(
      'autocomplete',
      new CG.enum(...INPUT_AUTO_COMPLETE)
        .optional()
        .setTitle('Autocomplete')
        .setDescription(
          'The HTML autocomplete attribute helps browsers suggest or autofill input values based on the expected type of data.',
        ),
    ),
  )
  .addSummaryOverrides()
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
