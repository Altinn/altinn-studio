import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Action,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: true,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
})
  .addTextResource(
    new CG.trb({
      name: 'back',
      title: 'Back',
      description: 'Text on the back/previous page button',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'next',
      title: 'Next',
      description: 'Text on the next page button',
    }),
  )
  .addProperty(
    new CG.prop(
      'showBackButton',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Show back button')
        .setDescription("Shows two buttons (back/next) instead of just 'next'."),
    ),
  )
  .addProperty(new CG.prop('triggers', CG.common('TriggerList').optional()));
