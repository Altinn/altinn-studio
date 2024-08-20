import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Presentation,
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
  .extendTextResources(CG.common('TRBLabel'))
  .addProperty(new CG.prop('formatting', CG.common('IFormatting').optional()))
  .addProperty(new CG.prop('value', new CG.expr(ExprVal.Number)))
  .addProperty(new CG.prop('direction', new CG.enum('horizontal', 'vertical').optional({ default: 'horizontal' })))
  .addProperty(new CG.prop('icon', new CG.str().optional().addExample('https://example.com/icon.svg')));
