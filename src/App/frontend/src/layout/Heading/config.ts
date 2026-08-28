import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Tittel', en: 'Header' },
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
      description: { en: 'The text to display in the heading', nb: 'Teksten som vises i overskriften.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: { en: 'Help text', nb: 'Hjelpetekst' },
      description: {
        en: 'The text to display in the help tooltip/popup',
        nb: 'Teksten som vises i hjelpetekstvinduet.',
      },
    }),
  )
  .addProperty(
    new CG.prop(
      'size',
      new CG.enum('L', 'M', 'S', 'h2', 'h3', 'h4')
        .setTitle('Size', 'Størrelse')
        .setDescription('The size of the heading', 'Overskriftens størrelse.'),
    ),
  )
  .addSummaryOverrides();
