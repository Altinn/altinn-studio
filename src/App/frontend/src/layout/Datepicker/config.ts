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
  .addProperty(new CG.prop('autocomplete', new CG.const('bday').optional()))
  .addProperty(
    new CG.prop(
      'minDate',
      new CG.union(
        new CG.expr(ExprVal.String),
        new CG.const('today'),
        new CG.const('yesterday'),
        new CG.const('tomorrow'),
        new CG.const('oneYearAgo'),
        new CG.const('oneYearFromNow'),
      )
        .optional({ default: '1900-01-01T12:00:00.000Z' })
        .setTitle('Earliest date')
        .setDescription(
          "Sets the earliest allowed date. Can also use keyword 'today' to disable all past dates dynamically based " +
            'on the current date. Defaults to 1900-01-01T12:00:00.000Z.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'maxDate',
      new CG.union(
        new CG.expr(ExprVal.String),
        new CG.const('today'),
        new CG.const('yesterday'),
        new CG.const('tomorrow'),
        new CG.const('oneYearAgo'),
        new CG.const('oneYearFromNow'),
      )
        .optional({ default: '2100-01-01T12:00:00.000Z' })
        .setTitle('Latest date')
        .setDescription(
          "Sets the latest allowed date. Can also use keyword 'today' to disable all future dates dynamically based " +
            'on the current date. Defaults to 2100-01-01T12:00:00.000Z.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'timeStamp',
      new CG.bool()
        .optional({ default: true })
        .setTitle('Include time')
        .setDescription(
          'Boolean value indicating if the date time should be stored as a timeStamp. Defaults to true. ' +
            "If true: 'yyyy-MM-ddThh:mm:ss.sssZ', if false 'yyyy-MM-dd';",
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'format',
      new CG.str()
        .optional({ default: 'dd.MM.yyyy' })
        .setTitle('Date format')
        .setDescription(
          'Date format used when filling out and displaying the date to the user. ' +
            "If not set the format will be based on the user's selected language.",
        )
        .addExample('dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'),
    ),
  )
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'))
  .addSummaryOverrides();
