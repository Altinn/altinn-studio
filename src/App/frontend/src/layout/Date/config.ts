import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Date', en: 'Date' },
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
  .addSummaryOverrides()
  .extendTextResources(CG.common('TRBLabel'))
  .addProperty(
    new CG.prop(
      'format',
      new CG.str()
        .optional()
        .setTitle('Date format', 'Datoformat')
        .setDescription('The format used to display the date.', 'Formatet som brukes for å vise datoen.')
        .addExample('dd.MM.yyyy'),
    ),
  )
  .addProperty(
    new CG.prop(
      'value',
      new CG.expr(ExprVal.String)
        .setTitle('Date value', 'Datoverdi')
        .setDescription('The date value to display.', 'Datoverdien som skal vises.'),
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
          'The URL of an icon displayed with the date.',
          'URL-en til et ikon som vises sammen med datoen.',
        )
        .addExample('https://example.com/icon.svg'),
    ),
  );
