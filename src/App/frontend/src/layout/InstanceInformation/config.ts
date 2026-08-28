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
  functionality: {
    customExpressions: false,
  },
})
  .addProperty(
    new CG.prop(
      'elements',
      new CG.obj(
        new CG.prop('dateSent', new CG.bool().optional()),
        new CG.prop('sender', new CG.bool().optional()),
        new CG.prop('receiver', new CG.bool().optional()),
        new CG.prop('referenceNumber', new CG.bool().optional()),
      )
        .optional()
        .setTitle('Elements', 'Elementer')
        .setDescription(
          'Which elements to show in the instance information',
          'Angir hvilke elementer som skal vises i instansinformasjonen.',
        ),
    ),
  )
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
