import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Betaling', en: 'Payment' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
    renderInTabs: false,
  },
  functionality: {
    customExpressions: false,
  },
  directRendering: false,
})
  .makeSummarizable()
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'The title of the paragraph', nb: 'Ledeteksten til avsnittet.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: { en: 'Description', nb: 'Beskrivelse' },
      description: {
        en: 'Description, optionally shown below the title',
        nb: 'Valgfri beskrivelse som vises under ledeteksten.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: 'Help text',
      description: 'Help text shown in a tooltip when clicking the help button',
    }),
  )
  .addSummaryOverrides();
