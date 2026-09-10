import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Diktafon', en: 'Dictaphone' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: false,
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
  .addProperty(
    new CG.prop(
      'maxLength',
      new CG.int()
        .optional()
        .setTitle('Max length', 'Maksimal lengde')
        .setDescription(
          'Max length of the field. Adds a counter so the user knows how many characters are left.',
          'Maksimal lengde for feltet. Viser en teller med antall gjenstående tegn.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'sprak',
      new CG.str()
        .optional({ default: 'nb-NO' })
        .setTitle('Speech recognition language', 'Språk for talegjenkjenning')
        .setDescription(
          'BCP 47 language tag passed to the browser speech recogniser, e.g. nb-NO.',
          'BCP 47-språkkode som sendes til nettleserens talegjenkjenning, for eksempel nb-NO.',
        ),
    ),
  )
  .addSummaryOverrides()
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
