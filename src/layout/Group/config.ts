import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Container,
  directRendering: true,
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
      description: 'The title of the group (shown above the group)',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: 'Description',
      description: 'The description text shown underneath the title',
    }),
  )
  .addProperty(
    new CG.prop(
      'groupingIndicator',
      new CG.enum('indented', 'panel')
        .optional()
        .setTitle('Set grouping indicator')
        .setDescription('Can visually group components together by indenting them or by putting them in a panel. '),
    ),
  )
  .addProperty(
    new CG.prop(
      'children',
      new CG.arr(new CG.str())
        .setTitle('Children')
        .setDescription('Array of component IDs that should be displayed in the group'),
    ),
  )
  .addProperty(
    new CG.prop(
      'headingLevel',
      new CG.enum(2, 3, 4, 5, 6)
        .optional()
        .setTitle('Heading level')
        .setDescription('The heading level of the group title.'),
    ),
  )
  .addSummaryOverrides();
