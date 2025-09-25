import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
    displayData: false,
  },
})
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'))
  .addProperty(new CG.prop('title', new CG.str()))
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'tableData',
        new CG.dataModelBinding().setTitle('TableData').setDescription('Array of objects where the data is stored'),
      ),
    )
      .optional()
      .exportAs('IDataModelBindingsForTable'),
  )
  .addProperty(
    new CG.prop(
      'columns',
      new CG.arr(
        new CG.obj(
          new CG.prop('header', new CG.str()),
          new CG.prop(
            'accessors',
            new CG.arr(new CG.str())
              .setTitle('Accessors')
              .setDescription('List of fields that should be included in the cell'),
          ),

          new CG.prop(
            'component',
            new CG.union(
              new CG.obj(
                new CG.prop('type', new CG.const('link')),
                new CG.prop('hrefPath', new CG.str()),
                new CG.prop('textPath', new CG.str()),
                new CG.prop('openInNewTab', new CG.bool().optional()),
              ),
              new CG.obj(
                new CG.prop('type', new CG.const('date')),
                new CG.prop(
                  'format',
                  new CG.str()
                    .setTitle('Date format')
                    .setDescription('Date format used when displaying the date to the user')
                    .addExample('dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd')
                    .optional(),
                ),
              ),
              new CG.obj(
                new CG.prop('type', new CG.const('radio')),
                new CG.prop(
                  'options',
                  new CG.arr(
                    new CG.obj(new CG.prop('label', new CG.str()), new CG.prop('value', new CG.str())),
                  ).optional(),
                ),
              ),
            )
              .setUnionType('discriminated')
              .optional(),
          ),
        ).exportAs('Columns'),
      ),
    ),
  )
  .addProperty(
    new CG.prop(
      'zebra',
      new CG.bool().setTitle('Size').setDescription('If true, the table will have zebra striping').optional(),
    ),
  )
  .addProperty(
    new CG.prop(
      'enableDelete',
      new CG.bool().setTitle('Enable delete').setDescription('If true, will allow user to delete row').optional(),
    ),
  )
  .addProperty(
    new CG.prop(
      'enableEdit',
      new CG.bool().setTitle('Enable delete').setDescription('If true, will allow user to edit row').optional(),
    ),
  )
  .addProperty(
    new CG.prop('size', new CG.enum('sm', 'md', 'lg').setTitle('Size').setDescription('Size of table.').optional()),
  )
  .addProperty(
    new CG.prop(
      'externalApi',
      new CG.obj(new CG.prop('id', new CG.str()), new CG.prop('path', new CG.str())).optional().exportAs('DataConfig'),
    ),
  );
