import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { OptionsPlugin } from 'src/features/options/OptionsPlugin';
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
  .addPlugin(new OptionsPlugin({ supportsPreselection: true, type: 'multi' }))
  .addProperty(
    new CG.prop(
      'alertOnChange',
      new CG.expr(ExprVal.Boolean)
        .optional({ default: false })
        .setTitle('Alert on change')
        .setDescription('Boolean value indicating if the component should alert on change'),
    ),
  )
  .addSummaryOverrides((obj) => {
    obj.addProperty(
      new CG.prop(
        'displayType',
        new CG.enum('list', 'string')
          .optional()
          .setTitle('Display type')
          .setDescription('How data should be displayed for the this multiple select component in the summary'),
      ),
    );
  })
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'group',
        new CG.dataModelBinding()
          .setTitle('group')
          .setDescription(
            'Dot notation location for a repeating structure (array of objects), where you want to save the content of checked checkboxes',
          )
          .optional(),
      ),
      new CG.prop(
        'checked',
        new CG.dataModelBinding()
          .setTitle('checked')
          .setDescription(
            'If deletionStrategy=soft and group is set, this value points to where you want to save deleted status.',
          )
          .optional(),
      ),
    )
      .exportAs('IDataModelBindingsForGroupMultiselect')
      .extends(CG.common('IDataModelBindingsOptionsSimple')),
  )
  .addProperty(new CG.prop('deletionStrategy', new CG.enum('soft', 'hard').optional()))
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
