import { CG, Variant } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Action,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
    renderInAccordion: true,
    renderInAccordionGroup: false,
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
      new CG.enum('submit', 'save', 'go-to-task', 'instantiate')
        .optional({ default: 'submit' })
        .setTitle('Mode')
        .setDescription('The mode of the button')
        .exportAs('ButtonMode'),
    ),
  )
  .addProperty(
    new CG.prop(
      'taskId',
      new CG.str()
        .optional()
        .setTitle('Task ID')
        .setDescription('The ID of the task to go to (only used when mode is "go-to-task")'),
    ),
  )
  .addProperty(
    new CG.prop(
      'busyWithId',
      new CG.str()
        .optional()
        .setDescription(
          'Possibly an internally used flag to make the button look like its loading (only used when mode is "instantiate")',
        ),
    ).onlyIn(Variant.Internal),
  )
  .addProperty(new CG.prop('mapping', CG.common('IMapping').optional()));
