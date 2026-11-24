import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Informasjon om eksemplaret', en: 'InstanceInformation' },
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
})
  .makeSummarizable()
  .addSummaryOverrides()
  .addProperty(
    new CG.prop(
      'elements',
      new CG.obj(
        new CG.prop('dateSent', new CG.bool().optional({ default: true })),
        new CG.prop('sender', new CG.bool().optional({ default: true })),
        new CG.prop('receiver', new CG.bool().optional({ default: true })),
        new CG.prop('referenceNumber', new CG.bool().optional({ default: true })),
      )
        .optional()
        .setTitle('Elements', 'Elementer')
        .setDescription(
          'Which elements to show in the instance information. All elements are shown by default. Set an element to false to hide it.',
          'Angir hvilke elementer som skal vises i instansinformasjonen. Alle elementene vises som standard. Sett et element til false for å skjule det.',
        ),
    ),
  )
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
