import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Action,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
})
  .addProperty(
    new CG.prop(
      'compact',
      new CG.bool()
        .optional()
        .setTitle('Compact')
        .setDescription('Change appearance of navbar as compact in desktop view'),
    ),
  )
  .addProperty(new CG.prop('triggers', CG.common('TriggerList').optional()));
