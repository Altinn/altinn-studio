import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Presentation,
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
    customExpressions: false,
  },
})
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'Title shown above the attachment list',
    }),
  )
  .addProperty(
    new CG.prop(
      'dataTypeIds',
      new CG.arr(new CG.str())
        .optional()
        .setTitle('Data type IDs')
        .setDescription('List of data type IDs for the attachment list to show'),
    ),
  )
  .addProperty(
    new CG.prop(
      'links',
      new CG.bool()
        .optional({ default: true })
        .setTitle('Link to each attachment')
        .setDescription('Disable this to remove the link to each attachment'),
    ),
  )
  .addProperty(
    new CG.prop(
      'groupByDataTypeGrouping',
      new CG.bool().optional({ default: false }).setDescription('Group attachments by their data type grouping'),
    ),
  );
