import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { EXTERNAL_INPUT_TYPE, INPUT_AUTO_COMPLETE } from 'src/layout/Input/constants';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Lite tekstfelt', en: 'Short text' },
    lifecycle: { status: 'stable' },
  },
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
      title: { en: 'Prefix', nb: 'Prefiks' },
      description: { en: 'Prefix shown before the input field', nb: 'Prefiks som vises foran inndatafeltet.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'suffix',
      title: { en: 'Suffix', nb: 'Suffiks' },
      description: { en: 'Suffix shown after the input field', nb: 'Suffiks som vises etter inndatafeltet.' },
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
        .setTitle('Input variant', 'Variant for inndatafelt')
        .setDescription(
          'The variant of the input field (text or search).',
          'Varianten til inndatafeltet: tekst eller søk.',
        ),
    ),
  )
  .addProperty(new CG.prop('autocomplete', CG.common('HTMLAutoCompleteValues').optional()))
  .addProperty(
    new CG.prop(
      'maxLength',
      new CG.int()
        .optional()
        .setTitle('Max length', 'Maksimal lengde')
        .setDescription(
          'Max length of the input field. Will add a counter to let the user know how many characters are left.',
          'Maksimal lengde for inndatafeltet. Viser en teller med antall gjenstående tegn.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'autocomplete',
      new CG.enum(...INPUT_AUTO_COMPLETE)
        .optional()
        .setTitle('Autocomplete', 'Autofullføring')
        .setDescription(
          'The HTML autocomplete attribute helps browsers suggest or autofill input values based on the expected type of data.',
          'HTML-attributtet autocomplete hjelper nettleseren med å foreslå eller fylle ut verdier ut fra forventet datatype.',
        ),
    ),
  )
  .addSummaryOverrides()
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
