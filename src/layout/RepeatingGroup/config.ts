import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { CompCategory } from 'src/layout/common';
import { GridRowsPlugin } from 'src/layout/Grid/GridRowsPlugin';
import { RepeatingChildrenPlugin } from 'src/utils/layout/plugins/RepeatingChildrenPlugin';

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
    customExpressions: true,
    displayData: false,
  },
})
  .addPlugin(new RepeatingChildrenPlugin({ multiPageSupport: 'edit.multiPage' }))
  .addPlugin(
    new GridRowsPlugin({
      externalProp: 'rowsBefore',
      optional: true,
    }),
  )
  .addPlugin(
    new GridRowsPlugin({
      externalProp: 'rowsAfter',
      optional: true,
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'The title of the group (shown above each instance in a Summary)',
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
      name: 'add_button_full',
      title: 'Add button (full) (for repeating groups)',
      description: 'The text for the "Add" button (overrides "add_button", and sets the full text for the button)',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'add_button',
      title: 'Add button (suffix) (for repeating groups)',
      description: 'The text for the "Add" button (used as a suffix after the default button text)',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'save_button',
      title: 'Save button (for repeating groups)',
      description: 'The text for the "Save" button when the repeating group item is in edit mode',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'save_and_next_button',
      title: 'Save and next button (for repeating groups)',
      description:
        'The text for the "Save and next" button when the repeating group item is in edit mode ' +
        '(only displayed if edit.saveAndNextButton is true)',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'edit_button_close',
      title: 'Edit button (close) (for repeating groups)',
      description:
        'The text for the "Edit" button when the repeating group item is in ' +
        'edit mode (i.e. the user can close the edit mode)',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'edit_button_open',
      title: 'Edit button (open) (for repeating groups)',
      description:
        'The text for the "Edit" button when the repeating group item is not in edit mode (i.e. the user can open the edit mode)',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'pagination_next_button',
      title: 'Next button in pagination',
      description: 'The text for the "Next" button in pagination',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'pagination_back_button',
      title: 'Back button in pagination',
      description: 'The text for the "Back" button in pagination',
    }),
  )
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'group',
        new CG.dataModelBinding()
          .setTitle('Group')
          .setDescription(
            'Dot notation location for a repeating group structure (array of objects), where the data is stored',
          ),
      ),
    ).exportAs('IDataModelBindingsForGroup'),
  )
  .addProperty(new CG.prop('showValidations', CG.common('AllowedValidationMasks').optional()))
  .addProperty(new CG.prop('validateOnSaveRow', CG.common('AllowedValidationMasks').optional()))
  .addProperty(
    new CG.prop(
      'edit',
      new CG.obj(
        new CG.prop(
          'mode',
          new CG.enum('hideTable', 'showTable', 'showAll', 'onlyTable')
            .optional({ default: 'showTable' })
            .setTitle('Mode')
            .setDescription('The mode of the repeating group'),
        ),
        new CG.prop(
          'addButton',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: true })
            .setTitle('Add button')
            .setDescription('Expression or boolean indicating whether to show the "Add" button'),
        ),
        new CG.prop(
          'saveButton',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: true })
            .setTitle('Save button')
            .setDescription('Expression or boolean indicating whether to show the "Save" button'),
        ),
        new CG.prop(
          'deleteButton',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: true })
            .setTitle('Delete button')
            .setDescription('Expression or boolean indicating whether to show the "Delete" button'),
        ),
        new CG.prop(
          'editButton',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: true })
            .setTitle('Edit button')
            .setDescription('Expression or boolean indicating whether to show the "Edit" button'),
        ),
        new CG.prop(
          'multiPage',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Multi page functionality')
            .setDescription(
              'Turning this on makes it possible to display the edit mode for a repeating group with multiple ' +
                'inner pages. Every component referenced in the "children" property should have a prefix with the ' +
                'page number it should be displayed on (e.g. "1:component1", "2:component2", etc.)',
            ),
        ),
        new CG.prop(
          'openByDefault',
          new CG.union(new CG.bool(), new CG.const('first'), new CG.const('last'))
            .optional({ default: false })
            .setTitle('Open by default')
            .setDescription(
              'If set to true, a row of the repeating group will be opened by default, if the group has no ' +
                'rows already. If set to "first" or "last", the first or last row will be opened by default',
            ),
        ),
        new CG.prop(
          'alertOnDelete',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: false })
            .setTitle('Alert on delete')
            .setDescription(
              'Expression or boolean indicating whether to show an alert when the user ' +
                'clicks the "Delete" button, prompting them to confirm the deletion',
            ),
        ),
        new CG.prop(
          'saveAndNextButton',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: false })
            .setTitle('Save and next button')
            .setDescription(
              'Expression or boolean indicating whether to show the "Save and next" button when editing ' +
                'a repeating group row. This button will save the current row and open the next row for editing.',
            ),
        ),
        new CG.prop(
          'alwaysShowAddButton',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Always show add button')
            .setDescription(
              'If set to true, the "Add" button will always be shown, even if the user is ' +
                'currently editing another row',
            ),
        ),
      )
        .exportAs('IGroupEditProperties')
        .optional(),
    ),
  )
  .addProperty(
    new CG.prop(
      'pagination',
      new CG.obj(new CG.prop('rowsPerPage', new CG.int().setMin(1)))
        .optional()
        .setTitle('Pagination options')
        .setDescription('Pagination options for the repeating group rows.'),
    ),
  )
  .addProperty(
    new CG.prop(
      'maxCount',
      new CG.int()
        .optional()
        .setMin(1)
        .setTitle('Max number of rows')
        .setDescription('Maximum number of rows that can be added.'),
    ),
  )
  .addProperty(
    new CG.prop(
      'minCount',
      new CG.int()
        .setMin(0)
        .optional({ default: 0 })
        .setTitle('Min number of rows')
        .setDescription(
          'Minimum number of rows that should be added. If the user has not added enough rows, ' +
            'the repeating group will show a validation error',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'tableHeaders',
      new CG.arr(new CG.str())
        .optional()
        .setTitle('Table headers')
        .setDescription(
          'Array of component IDs that should be displayed as table headers. If not defined, all components ' +
            'referenced in the "children" property will be displayed as table headers',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'tableColumns',
      new CG.obj()
        .optional()
        .additionalProperties(
          new CG.obj(
            new CG.prop(
              'editInTable',
              new CG.bool()
                .optional({ default: false })
                .setTitle('Edit in table')
                .setDescription('If set to true, the component will be editable directly in the table view. '),
            ),
            new CG.prop(
              'showInExpandedEdit',
              new CG.bool()
                .optional({ default: true })
                .setTitle('Show in expanded edit')
                .setDescription(
                  'If set to true, the component will be shown in the expanded edit view. This is also the default ' +
                    'behaviour, but can be turned off for components that are only to be edited in the table view.',
                ),
            ),
          )
            .extends(CG.common('ITableColumnProperties'))
            .exportAs('IGroupColumnFormatting'),
        )
        .addExample({
          childComponent1: {
            width: 'auto',
          },
        }),
    ),
  )
  .addProperty(
    new CG.prop(
      'hiddenRow',
      new CG.expr(ExprVal.Boolean)
        .optional({ default: false })
        .setTitle('Hidden row?')
        .setDescription(
          'Expression or boolean indicating whether each row should be hidden. An expression will be evaluated per ' +
            'row, and if it evaluates to true, the row will be hidden. If set to true, all rows will be hidden.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'stickyHeader',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Sticky header')
        .setDescription('If set to true, the header of the repeating group will be sticky'),
    ),
  )
  .addProperty(new CG.prop('labelSettings', CG.common('ILabelSettings').optional()))
  .addProperty(new CG.prop('addButton', new CG.obj().extends(CG.common('IButtonProps')).optional()))
  .addSummaryOverrides((obj) => {
    obj.addProperty(
      new CG.prop(
        'display',
        new CG.enum('table', 'full')
          .optional({ default: 'full' })
          .setTitle('Display type')
          .setDescription('Show the summary as a table or as full summary components'),
      ),
    );
  });
