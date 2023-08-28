import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
})
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'The text to display in the header',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: 'Help text',
      description: 'The text to display in the help tooltip/popup',
    }),
  )
  .addProperty(
    new CG.prop(
      'size',
      new CG.enum('L', 'M', 'S', 'h2', 'h3', 'h4').setTitle('Size').setDescription('The size of the header'),
    ),
  );
