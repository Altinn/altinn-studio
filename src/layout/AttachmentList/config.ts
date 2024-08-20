import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
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
  );
