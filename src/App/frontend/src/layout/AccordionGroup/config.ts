import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Container,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Nestet trekkspilliste', en: 'AccordionGroup' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: false,
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
      description: { en: 'The title of the accordion group', nb: 'Ledeteksten til trekkspillgruppen.' },
    }),
  )
  .addProperty(
    new CG.prop(
      'children',
      new CG.arr(new CG.str())
        .setTitle('Children', 'Underkomponenter')
        .setDescription(
          'List of child component IDs to show inside the accordion group (limited to other Accordion components)',
          'Liste over ID-ene til underkomponentene som skal vises i trekkspillgruppen. Bare Accordion-komponenter støttes.',
        ),
    ),
  );
