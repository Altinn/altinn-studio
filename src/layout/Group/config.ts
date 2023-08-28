import { CG, Variant } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { CompCategory } from 'src/layout/common';
import type { GenerateComponentLike } from 'src/codegen/dataTypes/GenerateComponentLike';

export const Config = new CG.component({
  category: CompCategory.Container,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
})
  .setLayoutNodeType(
    new CG.import({
      import: 'LayoutNodeForGroup',
      from: 'src/layout/Group/LayoutNodeForGroup',
    }),
  )
  .addProperty(
    new CG.prop(
      'children',
      new CG.arr(new CG.str())
        .setTitle('Children')
        .setDescription('Array of component IDs that should be displayed in the group'),
    ).onlyIn(Variant.External),
  );

// Remove these so they're not set to undefined, as is the default for all other components. We override these anyway.
Config.inner.removeProperty('textResourceBindings');
Config.inner.removeProperty('dataModelBindings');

const commonNonRepChildComponents = new CG.prop('childComponents', new CG.arr(CG.layoutNode)).onlyIn(Variant.Internal);

const commonRepRowsProp = new CG.prop(
  'rows',
  new CG.arr(
    new CG.obj(
      new CG.prop('index', new CG.num()),
      new CG.prop('items', new CG.arr(CG.layoutNode)),
      new CG.prop(
        'groupExpressions',
        new CG.import({
          import: 'HGroupExpressions',
          from: 'src/layout/Group/types',
        }).optional(),
      ),
    ).exportAs('HRepGroupRow'),
  ).exportAs('HRepGroupRows'),
).onlyIn(Variant.Internal);

const commonShowGroupingIndicatorProp = new CG.prop(
  'showGroupingIndicator',
  new CG.bool()
    .optional({ default: false })
    .setTitle('Show grouping indicator')
    .setDescription(
      'If set to true, non-repeating groups will show an indicator to the left of the entire group contents, ' +
        'making it visually clear that the child components are grouped together.',
    ),
);

const commonRepGroupDataModelBinding = new CG.obj(
  new CG.prop(
    'group',
    new CG.str()
      .setTitle('Group')
      .setDescription(
        'Dot notation location for a repeating group structure (array of objects), where the data ' + 'is stored',
      ),
  ),
)
  .exportAs('IDataModelBindingsForGroup')
  .optional({ onlyIn: Variant.Internal });

const commonUndefinedDataModelBinding = new CG.raw({ typeScript: 'undefined' }).optional();

function commonExtensions(subType: GenerateComponentLike) {
  return subType
    .extends(Config)
    .extends(CG.common('SummarizableComponentProps'))
    .extendTextResources(CG.common('TRBSummarizable'));
}

Config.overrideExported(
  new CG.union(
    commonExtensions(makeRepeatingGroup()).inner.exportAs('CompGroupRepeating'),
    commonExtensions(makeNonRepeatingGroup()).inner.exportAs('CompGroupNonRepeating'),
    commonExtensions(makeNonRepeatingPanelGroup()).inner.exportAs('CompGroupNonRepeatingPanel'),
    commonExtensions(makeRepeatingLikertGroup()).inner.exportAs('CompGroupRepeatingLikert'),
  ),
);

function makeRepeatingGroup() {
  return new CG.componentLike()
    .addTextResource(
      new CG.trb({
        name: 'title',
        title: 'Title',
        description: 'The title of the group (shown above each instance in a Summary)',
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
    .addDataModelBinding(commonRepGroupDataModelBinding)
    .addProperty(new CG.prop('triggers', CG.common('TriggerList').optional()))
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
            'filter',
            new CG.arr(
              new CG.obj(new CG.prop('key', new CG.str()), new CG.prop('value', new CG.str())).exportAs('IGroupFilter'),
            )
              .optional()
              .setTitle('Filter')
              .setDescription(
                'Optionally filter out certain rows from the repeating group ' +
                  '(deprecated, use an expression in the "hiddenRow" property instead)',
              ),
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
    .addProperty(commonRepRowsProp)
    .addProperty(
      new CG.prop(
        'maxCount',
        new CG.int()
          .setMin(2)
          .setTitle('Max number of rows')
          .setDescription(
            'Maximum number of rows that can be added. Setting this to a value ' +
              'higher than 1 turns the group into a repeating group',
          ),
      ),
    )
    .addProperty(
      new CG.prop(
        'minCount',
        new CG.int()
          .optional()
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
    .addProperty(new CG.prop('rowsBefore', CG.common('GridRows').optional()))
    .addProperty(new CG.prop('rowsAfter', CG.common('GridRows').optional()));
}

function makeNonRepeatingGroup() {
  return new CG.componentLike()
    .addProperty(new CG.prop('dataModelBindings', commonUndefinedDataModelBinding).onlyIn(Variant.Internal))
    .addTextResource(
      new CG.trb({
        name: 'title',
        title: 'Title',
        description: 'The title of the group (shown above the group)',
      }),
    )
    .addTextResource(
      new CG.trb({
        name: 'body',
        title: 'Body',
        description: 'The body text shown underneath the title',
      }),
    )
    .addProperty(commonNonRepChildComponents)
    .addProperty(
      new CG.prop(
        'maxCount',
        new CG.int()
          .optional({ default: 1 })
          .setMax(1)
          .setTitle('Max number of rows')
          .setDescription(
            'Maximum number of rows that can be added. Setting this to a value ' +
              'higher than 1 turns the group into a repeating group',
          ),
      ),
    )
    .addProperty(commonShowGroupingIndicatorProp);
}

function makeNonRepeatingPanelGroup() {
  return new CG.componentLike()
    .addProperty(new CG.prop('dataModelBindings', commonUndefinedDataModelBinding).onlyIn(Variant.Internal))
    .addTextResource(
      new CG.trb({
        name: 'title',
        title: 'Title',
        description: 'The title of the group (shown above the group)',
      }),
    )
    .addTextResource(
      new CG.trb({
        name: 'add_label',
        title: 'Add button label',
        description: 'The text for the "Add" button (for adding another row to the referenced repeating group)',
      }),
    )
    .addTextResource(
      new CG.trb({
        name: 'body',
        title: 'Body',
        description: 'The body text of the Panel',
      }),
    )
    .addProperty(commonNonRepChildComponents)
    .addProperty(
      new CG.prop(
        'maxCount',
        new CG.int()
          .optional({ default: 1 })
          .setMax(1)
          .setTitle('Max number of rows')
          .setDescription(
            'Maximum number of rows that can be added. Setting this to a value ' +
              'higher than 1 turns the group into a repeating group',
          ),
      ),
    )
    .addProperty(
      new CG.prop(
        'panel',
        new CG.obj(
          new CG.prop(
            'iconUrl',
            new CG.str()
              .optional()
              .setTitle('Icon URL')
              .setDescription('URL to an icon image that overrides the default icon'),
          ),
          new CG.prop(
            'iconAlt',
            new CG.str().optional().setTitle('Icon alt text').setDescription('Alt text for the icon'),
          ),
          new CG.prop(
            'groupReference',
            new CG.obj(new CG.prop('group', new CG.str().setTitle('Repeating group component ID')))
              .optional()
              .setTitle('Group reference')
              .setDescription(
                'Reference to a repeating group ID. This will make it possible to add a row to the referenced group ' +
                  'from the current group Panel (see also the "add_label" text resource binding.',
              )
              .addExample({
                group: 'repeatingGroup1',
              }),
          ),
        )
          .extends(CG.common('IPanelBase'))
          .exportAs('IGroupPanel'),
      ),
    )
    .addProperty(commonShowGroupingIndicatorProp);
}

function makeRepeatingLikertGroup() {
  return new CG.componentLike()
    .addTextResource(
      new CG.trb({
        name: 'title',
        title: 'Title',
        description: 'The title of the group',
      }),
    )
    .addTextResource(
      new CG.trb({
        name: 'leftColumnHeader',
        title: 'Left column header (for repeating groups displayed as Likert)',
        description: 'The header text for the left column in the Likert table (when edit.mode is "likert")',
      }),
    )
    .addTextResource(
      new CG.trb({
        name: 'description',
        title: 'Description (for repeating groups displayed as Likert)',
        description: 'The description text for the Likert table (when edit.mode is "likert")',
      }),
    )
    .addProperty(commonRepRowsProp)
    .addDataModelBinding(commonRepGroupDataModelBinding)
    .addProperty(
      new CG.prop(
        'edit',
        new CG.obj(
          new CG.prop(
            'mode',
            new CG.const('likert').setTitle('Mode').setDescription('The mode of the repeating group'),
          ),
          new CG.prop(
            'filter',
            new CG.arr(
              new CG.obj(new CG.prop('key', new CG.str()), new CG.prop('value', new CG.str())).exportAs('IGroupFilter'),
            )
              .optional()
              .setTitle('Filter')
              .setDescription(
                'Optionally filter out certain rows from the repeating group ' +
                  '(deprecated, use an expression in the "hiddenRow" property instead)',
              ),
          ),
        ).exportAs('IGroupEditPropertiesLikert'),
      ),
    )
    .addProperty(
      new CG.prop(
        'maxCount',
        new CG.int()
          .setMin(2)
          .setTitle('Max number of rows')
          .setDescription(
            'Maximum number of rows that can be added. Setting this to a value ' +
              'higher than 1 turns the group into a repeating group',
          ),
      ),
    );
}
