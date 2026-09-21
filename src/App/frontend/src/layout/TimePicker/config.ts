import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'TimePicker', en: 'TimePicker' },
    lifecycle: { status: 'stable' },
  },
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
        .setTitle('Time format', 'Tidsformat')
        .setDescription(
          'Time format used for displaying and input. ' +
            'HH:mm for 24-hour format, hh:mm a for 12-hour format with AM/PM.',
          'Tidsformatet for visning og inndata.',
        )
        .addExample('HH:mm', 'hh:mm a', 'HH:mm:ss'),
    ),
  )
  .addProperty(
    new CG.prop(
      'minTime',
      new CG.union(new CG.expr(ExprVal.String), new CG.str())
        .optional()
        .setTitle('Earliest time', 'Tidligste klokkeslett')
        .setDescription(
          'Sets the earliest allowed time in HH:mm format.',
          'Angir tidligste tillatte klokkeslett i formatet HH:mm.',
        )
        .addExample('08:00', '09:30'),
    ),
  )
  .addProperty(
    new CG.prop(
      'maxTime',
      new CG.union(new CG.expr(ExprVal.String), new CG.str())
        .optional()
        .setTitle('Latest time', 'Seneste klokkeslett')
        .setDescription(
          'Sets the latest allowed time in HH:mm format.',
          'Angir seneste tillatte klokkeslett i formatet HH:mm.',
        )
        .addExample('17:00', '23:30'),
    ),
  )
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'))
  .addSummaryOverrides();
