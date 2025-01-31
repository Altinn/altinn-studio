import { INPUT_AUTO_COMPLETE } from 'src/app-components/Input/constants';
import { CG } from 'src/codegen/CG';
import { AlertOnChangePlugin } from 'src/features/alertOnChange/AlertOnChangePlugin';
import { OptionsPlugin } from 'src/features/options/OptionsPlugin';
import { CompCategory } from 'src/layout/common';

export const DROPDOWN_SUMMARY_OVERRIDE_PROPS = new CG.obj()
  .extends(CG.common('ISummaryOverridesCommon'))
  .optional()
  .setTitle('Summary properties')
  .setDescription('Properties for how to display the summary of the component')
  .exportAs('DropdownSummaryOverrideProps');

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
    customExpressions: false,
  },
})
  .addPlugin(new OptionsPlugin({ supportsPreselection: true, type: 'single' }))
  .addPlugin(
    new AlertOnChangePlugin({
      propName: 'alertOnChange',
      title: 'Alert on change',
      description: 'Boolean value indicating if the component should alert on change',
    }),
  )
  .addProperty(
    new CG.prop(
      'autocomplete',
      new CG.enum(...INPUT_AUTO_COMPLETE)
        .optional()
        .setTitle('Autocomplete')
        .setDescription(
          'The HTML autocomplete attribute helps browsers suggest or autofill input values based on the expected type of data.',
        ),
    ),
  )
  .addDataModelBinding(CG.common('IDataModelBindingsOptionsSimple'))
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
