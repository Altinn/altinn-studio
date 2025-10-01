import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
  directRendering: true,
})
  .addProperty(
    new CG.prop(
      'target',
      new CG.union(
        new CG.obj(
          new CG.prop('type', new CG.const('page')),
          new CG.prop('id', new CG.str()),
          new CG.prop(
            'taskId',
            new CG.str()
              .optional()
              .setTitle('Task ID')
              .setDescription('Use this if you want to render a page from another task.'),
          ),
        ).exportAs('SummaryTargetPage'),
        new CG.obj(
          new CG.prop('type', new CG.const('layoutSet')),
          new CG.prop(
            'taskId',
            new CG.str()
              .optional()
              .setTitle('Task ID')
              .setDescription('Use this if you want to render a layout set from another task.'),
          ),
        ).exportAs('SummaryTargetLayoutSet'),
        new CG.obj(
          new CG.prop('type', new CG.const('component').optional()),
          new CG.prop('id', new CG.str()),
          new CG.prop(
            'taskId',
            new CG.str()
              .optional()
              .setTitle('Task ID')
              .setDescription('Use this if you want to render a single component from another task.'),
          ),
        ).exportAs('SummaryTargetComponent'),
      )
        .setUnionType('discriminated')
        .optional({
          default: { type: 'layoutSet' },
        }),
    ),
  )
  .addProperty(new CG.prop('showPageInAccordion', new CG.bool().optional()))
  .addProperty(new CG.prop('isCompact', new CG.bool().optional()))
  .addProperty(
    new CG.prop(
      'hideEmptyFields',
      new CG.bool()
        .optional()
        .setDescription("Set this to true if you don't want to show fields that have not been filled out."),
    ),
  )
  .addProperty(
    new CG.prop(
      'overrides',
      new CG.arr(
        new CG.union(
          CG.common('AnySummaryOverride'),
          new CG.obj(
            new CG.prop('pageId', new CG.str()),
            new CG.prop('hidden', new CG.bool().optional({ default: false })),
          )
            .setTitle('Page-level override')
            .setDescription('Override for a specific page')
            .exportAs('SummaryOverrideForPage'),
        ),
      ).optional(),
    ),
  );
