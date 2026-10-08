import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Action,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Start eksemplar', en: 'InstantiationButton' },
    lifecycle: { status: 'stable' },
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
})
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'The title/text to display on the button', nb: 'Teksten som vises på knappen.' },
    }),
  )
  .addProperty(
    new CG.prop(
      'queryParameters',
      CG.common('IQueryParameters')
        .optional()
        .setDescription(
          'Values used to prefill the new instance.',
          'Verdier som brukes til å forhåndsutfylle det nye eksemplaret.',
        ),
    ),
  );
