import { CG, Variant } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Action,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
})
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'The title/text to display on the button',
    }),
  )
  .addProperty(new CG.prop('mapping', CG.common('IMapping').optional()))
  .addProperty(new CG.prop('busyWithId', new CG.str().optional()).onlyIn(Variant.Internal));
