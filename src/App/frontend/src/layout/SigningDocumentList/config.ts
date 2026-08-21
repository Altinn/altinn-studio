import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'SigningDocumentList', en: 'SigningDocumentList' },
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
      description: { en: 'Header/title of the list', nb: 'Overskriften eller ledeteksten til listen.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: { en: 'Description', nb: 'Beskrivelse' },
      description: { en: 'Description of the list', nb: 'Beskrivelse av listen.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: { en: 'Help', nb: 'Hjelp' },
      description: { en: 'Help text of the list', nb: 'Hjelpetekst for listen.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'summaryTitle',
      title: { en: 'Summary title', nb: 'Tittel i oppsummering' },
      description: { en: 'Header/title of the summary', nb: 'Overskriften eller ledeteksten til oppsummeringen.' },
    }),
  );
