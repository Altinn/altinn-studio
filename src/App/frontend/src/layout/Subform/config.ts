import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: false,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addProperty(
    new CG.prop(
      'layoutSet',
      new CG.str().setTitle('Layout set ID').setDescription('The layout set to load for this subform'),
    ),
  )
  .addProperty(new CG.prop('showAddButton', new CG.bool().optional({ default: true })))
  .addProperty(new CG.prop('showDeleteButton', new CG.bool().optional({ default: true })))
  .addProperty(new CG.prop('entryDisplayName', new CG.expr(ExprVal.String).optional()))
  .addProperty(
    new CG.prop(
      'tableColumns',
      new CG.arr(
        new CG.obj(
          new CG.prop(
            'headerContent',
            new CG.str()
              .setTitle('The column header value')
              .setDescription(
                'The header value to display. May contain a text resource bindings, but no data model lookups.',
              ),
          ),
          new CG.prop(
            'cellContent',
            new CG.union(
              new CG.obj(
                new CG.prop(
                  'value',
                  new CG.expr(ExprVal.String)
                    .setTitle('The cell value')
                    .setDescription('The cell value to display from an expression or static value'),
                ),
                new CG.prop(
                  'default',
                  new CG.str()
                    .optional()
                    .setTitle('The default cell value')
                    .setDescription('The cell value to display if `query` or `value` returns no result.'),
                ),
              ),
              new CG.obj(
                new CG.prop(
                  'query',
                  new CG.str()
                    .setTitle('The cell value via data model lookup')
                    .setDescription('The cell value to display from a data model lookup (dot notation).')
                    .setDeprecated('Use "value" with a dataModel-expression instead'),
                ),
                new CG.prop(
                  'default',
                  new CG.str()
                    .optional()
                    .setTitle('The default cell value')
                    .setDescription('The cell value to display if `query` or `value` returns no result.'),
                ),
              ),
            )
              .setUnionType('discriminated')
              .exportAs('ISubformCellContent'),
          ),
        ),
      ),
    ),
  )
  .addProperty(
    new CG.prop(
      'summaryDelimiter',
      new CG.str()
        .setTitle('The summary view cell delimiter')
        .setDescription(
          'The value used to separate cells/elements in a summary view where rich layout is not available. Typically a comma, dash or similar.',
        )
        .optional({ default: ' — ' }),
    ),
  )
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'The title of the subform component',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: 'Description',
      description: 'The description text shown underneath the title',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'addButton',
      title: 'Add button (suffix)',
      description: 'The text for the "Add" button (used as a suffix after the default button text)',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'tableEditButton',
      title: 'Table edit button',
      description: 'The text for the "Edit" button in the table rows',
    }),
  )
  .addSummaryOverrides((obj) => {
    obj.addProperty(
      new CG.prop(
        'display',
        new CG.enum('table', 'full')
          .optional({ default: 'table' })
          .setTitle('Display type')
          .setDescription('Show the summary as a table or as full summary components'),
      ),
    );
  });
