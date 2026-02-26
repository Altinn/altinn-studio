import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
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
    customExpressions: true,
  },
})
  .addDataModelBinding(CG.common('IDataModelBindingsSimple'))
  .addProperty(new CG.prop('autocomplete', new CG.const('time').optional()))
  .addProperty(
    new CG.prop(
      'format',
      new CG.union(new CG.const('HH:mm'), new CG.const('HH:mm:ss'), new CG.const('hh:mm a'), new CG.const('hh:mm:ss a'))
        .optional({ default: 'HH:mm' })
        .setTitle('Time format')
        .setDescription(
          'Time format used for displaying and input. ' +
            'HH:mm for 24-hour format, hh:mm a for 12-hour format with AM/PM.',
        )
        .addExample('HH:mm', 'hh:mm a', 'HH:mm:ss'),
    ),
  )
  .addProperty(
    new CG.prop(
      'minTime',
      new CG.union(new CG.expr(ExprVal.String), new CG.str())
        .optional()
        .setTitle('Earliest time')
        .setDescription('Sets the earliest allowed time in HH:mm format.')
        .addExample('08:00', '09:30'),
    ),
  )
  .addProperty(
    new CG.prop(
      'maxTime',
      new CG.union(new CG.expr(ExprVal.String), new CG.str())
        .optional()
        .setTitle('Latest time')
        .setDescription('Sets the latest allowed time in HH:mm format.')
        .addExample('17:00', '23:30'),
    ),
  )
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'))
  .addSummaryOverrides();
