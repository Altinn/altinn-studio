import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const DATEPICKER_SUMMARY_OVERRIDE_PROPS = new CG.obj()
  .extends(CG.common('ISummaryOverridesCommon'))
  .optional()
  .setTitle('Summary properties')
  .setDescription('Properties for how to display the summary of the component')
  .exportAs('DatepickerSummaryOverrideProps');

export const Config = new CG.component({
  category: CompCategory.Form,
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
  .addDataModelBinding(CG.common('IDataModelBindingsSimple'))
  .addProperty(
    new CG.prop(
      'minDate',
      new CG.union(new CG.str(), new CG.const('today'))
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
      new CG.union(new CG.str(), new CG.const('today'))
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
          'Date format used when displaying the date to the user. The user date format from the locale ' +
            'will be prioritized over this setting.',
        )
        .addExample('dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'),
    ),
  )
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
