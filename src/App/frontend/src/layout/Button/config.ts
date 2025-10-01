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
  .extends(CG.common('IButtonProps'))
  .addProperty(new CG.prop('mapping', CG.common('IMapping').optional()));
