import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'SimpleTable', en: 'SimpleTable' },
    lifecycle: { status: 'beta' },
  },
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
        new CG.dataModelBinding()
          .setTitle('TableData', 'Tabelldata')
          .setDescription('Array of objects where the data is stored', 'Liste over objektene der dataene lagres.'),
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
              .setTitle('Accessors', 'Tilgangsfunksjoner')
              .setDescription(
                'List of fields that should be included in the cell',
                'Liste over feltene som skal tas med i cellen.',
              ),
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
                    .setTitle('Date format', 'Datoformat')
                    .setDescription(
                      'Date format used when displaying the date to the user',
                      'Datoformatet som brukes når datoen vises til brukeren.',
                    )
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
      new CG.bool()
        .setTitle('Size', 'Størrelse')
        .setDescription('If true, the table will have zebra striping', 'Viser tabellen med stripete rader.')
        .optional(),
    ),
  )
  .addProperty(
    new CG.prop(
      'enableDelete',
      new CG.bool()
        .setTitle('Enable delete', 'Tillat sletting')
        .setDescription('If true, will allow user to delete row', 'Lar brukeren slette raden.')
        .optional(),
    ),
  )
  .addProperty(
    new CG.prop(
      'enableEdit',
      new CG.bool()
        .setTitle('Enable delete', 'Tillat sletting')
        .setDescription('If true, will allow user to edit row', 'Lar brukeren redigere raden.')
        .optional(),
    ),
  )
  .addProperty(
    new CG.prop(
      'size',
      new CG.enum('sm', 'md', 'lg')
        .setTitle('Size', 'Størrelse')
        .setDescription('Size of table.', 'Tabellens størrelse.')
        .optional(),
    ),
  )
  .addProperty(
    new CG.prop(
      'externalApi',
      new CG.obj(new CG.prop('id', new CG.str()), new CG.prop('path', new CG.str())).optional().exportAs('DataConfig'),
    ),
  );
