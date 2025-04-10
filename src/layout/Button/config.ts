import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Action,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
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
      description: 'The title/text on the button',
    }),
  )
  .addProperty(
    new CG.prop(
      'mode',
      new CG.enum('submit', 'save', 'instantiate')
        .optional({ default: 'submit' })
        .setTitle('Mode')
        .setDescription('The mode of the button')
        .exportAs('ButtonMode'),
    ),
  )
  .addProperty(
    new CG.prop(
      'textAlign',
      new CG.enum('left', 'center', 'right')
        .optional({ default: 'center' })
        .setTitle('Text Align')
        .exportAs('ButtonTextAlign'),
    ),
  )
  .addProperty(
    new CG.prop(
      'size',
      new CG.enum('sm', 'md', 'lg')
        .optional({ default: 'md' })
        .setTitle('Size')
        .setDescription('The size of the button')
        .exportAs('Size'),
    ),
  )
  .addProperty(
    new CG.prop(
      'fullWidth',
      new CG.bool().optional().setTitle('Full width').setDescription('Whether the button should expand to full width'),
    ),
  )
  .addProperty(new CG.prop('mapping', CG.common('IMapping').optional()));
