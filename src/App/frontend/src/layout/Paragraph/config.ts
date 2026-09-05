import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Avsnitt', en: 'Paragraph' },
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
    customExpressions: false,
  },
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
      name: 'help',
      title: { en: 'Help text', nb: 'Hjelpetekst' },
      description: {
        en: 'Help text, optionally shown in a tooltip',
        nb: 'Valgfri hjelpetekst som vises i et hjelpetekstvindu.',
      },
    }),
  )
  .addSummaryOverrides();
