import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Varsel', en: 'Alert' },
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
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'The title of the alert', nb: 'Ledeteksten til varselet.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'body',
      title: { en: 'Body', nb: 'Brødtekst' },
      description: { en: 'The body text of the alert', nb: 'Brødteksten i varselet.' },
    }),
  )
  .addProperty(
    new CG.prop(
      'severity',
      new CG.enum('success', 'warning', 'danger', 'info')
        .setTitle('Alert severity', 'Alvorlighetsgrad')
        .setDescription('The severity of the alert', 'Varselets alvorlighetsgrad.')
        .exportAs('AlertSeverity'),
    ),
  );
