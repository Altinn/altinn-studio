import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Action,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Utskrift', en: 'PrintButton' },
    lifecycle: { status: 'deprecated', replacedBy: 'PDFPreviewButton' },
  },
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
}).addTextResource(
  new CG.trb({
    name: 'title',
    title: { en: 'Title', nb: 'Ledetekst' },
    description: { en: 'The title/text on the button', nb: 'Teksten på knappen.' },
  }),
);
