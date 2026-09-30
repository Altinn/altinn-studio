import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { asOptionsComponent } from 'src/features/options/config';

export const Config = asOptionsComponent(
  new CG.component({
    category: CompCategory.Presentation,
    availability: 'configurable',
    metadata: {
      name: { nb: 'Option', en: 'Option' },
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
  }),
  { supportsPreselection: false },
)
  .makeSummarizable()
  .addSummaryOverrides()
  .extendTextResources(CG.common('TRBLabel'))
  .addProperty(
    new CG.prop(
      'value',
      new CG.expr(ExprVal.String)
        .setTitle('Selected value', 'Valgt verdi')
        .setDescription('The value represented by the option.', 'Verdien alternativet representerer.'),
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
          'The URL of an icon displayed with the option.',
          'URL-en til et ikon som vises med alternativet.',
        )
        .addExample('https://example.com/icon.svg'),
    ),
  );
