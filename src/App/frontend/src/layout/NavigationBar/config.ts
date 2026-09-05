import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Action,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Navigasjonsfelt', en: 'NavigationBar' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addProperty(
    new CG.prop(
      'compact',
      new CG.bool()
        .optional()
        .setTitle('Compact', 'Kompakt')
        .setDescription(
          'Change appearance of navbar as compact in desktop view',
          'Viser navigasjonslinjen i kompakt format på store skjermer.',
        ),
    ),
  )
  .addProperty(new CG.prop('validateOnForward', CG.common('PageValidation').optional()))
  .addProperty(new CG.prop('validateOnBackward', CG.common('PageValidation').optional()));
