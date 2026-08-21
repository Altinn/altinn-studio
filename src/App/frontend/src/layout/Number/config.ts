import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Number', en: 'Number' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInTabs: true,
    renderInCards: true,
    renderInCardsMedia: false,
  },
  functionality: {
    customExpressions: true,
  },
})
  .makeSummarizable()
  .extendTextResources(CG.common('TRBLabel'))
  .addProperty(new CG.prop('formatting', CG.common('IFormatting').optional()))
  .addProperty(
    new CG.prop(
      'value',
      new CG.expr(ExprVal.Number)
        .setTitle('Number value', 'Tallverdi')
        .setDescription('The number to display.', 'Tallet som skal vises.'),
    ),
  )
  .addProperty(new CG.prop('direction', new CG.enum('horizontal', 'vertical').optional({ default: 'horizontal' })))
  .addProperty(
    new CG.prop(
      'icon',
      new CG.str()
        .optional()
        .setTitle('Icon', 'Ikon')
        .setDescription(
          'The URL of an icon displayed with the number.',
          'URL-en til et ikon som vises sammen med tallet.',
        )
        .addExample('https://example.com/icon.svg'),
    ),
  )
  .addSummaryOverrides();
