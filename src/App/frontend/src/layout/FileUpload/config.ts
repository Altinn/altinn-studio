import { CG } from 'src/codegen/CG';
import { AttachmentsPlugin } from 'src/features/attachments/AttachmentsPlugin';
import { ExprVal } from 'src/features/expressions/types';
import { CompCategory } from 'src/layout/common';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';

export const Config = asUploaderComponent(
  new CG.component({
    category: CompCategory.Form,
    capabilities: {
      renderInTable: false,
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
  }),
);

export function asUploaderComponent(config: ComponentConfig) {
  return config
    .addPlugin(new AttachmentsPlugin())
    .addDataModelBinding(CG.common('IDataModelBindingsSimple').optional())
    .addDataModelBinding(CG.common('IDataModelBindingsList').optional())
    .addProperty(
      new CG.prop(
        'maxFileSizeInMB',
        new CG.int().setTitle('Max file size (MB)').setDescription('Sets the maximum file size allowed in megabytes'),
      ),
    )
    .addProperty(
      new CG.prop(
        'maxNumberOfAttachments',
        new CG.expr(ExprVal.Number)
          .setTitle('Max number of attachments')
          .setDescription('Sets the maximum number of attachments allowed to upload'),
      ),
    )
    .addProperty(
      new CG.prop(
        'minNumberOfAttachments',
        new CG.expr(ExprVal.Number)
          .setTitle('Min number of attachments')
          .setDescription('Sets the minimum number of attachments required to upload'),
      ),
    )
    .addProperty(new CG.prop('displayMode', new CG.enum('simple', 'list')))
    .addProperty(
      new CG.prop(
        'hasCustomFileEndings',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Has custom file endings')
          .setDescription('Boolean value indicating if the component has valid file endings'),
      ),
    )
    .addProperty(
      new CG.prop(
        'validFileEndings',
        new CG.union(new CG.str(), new CG.arr(new CG.str()))
          .optional()
          .setTitle('Valid file endings')
          .setDescription('A separated string of valid file endings to upload. If not set all endings are accepted.')
          .addExample('.csv', '.doc', '.docx', '.gif', '.jpeg', '.pdf', '.txt'),
      ),
    )
    .addProperty(
      new CG.prop(
        'alertOnDelete',
        new CG.expr(ExprVal.Boolean)
          .optional({ default: false })
          .setTitle('Alert on delete')
          .setDescription(
            'Boolean value indicating if warning popup should be displayed when attempting to delete an element',
          ),
      ),
    )
    .extends(CG.common('LabeledComponentProps'))
    .extendTextResources(CG.common('TRBLabel'));
}
