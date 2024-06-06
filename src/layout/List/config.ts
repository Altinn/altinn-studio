import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
  },
})
  .addTextResourcesForLabel()
  .addDataModelBinding(new CG.obj().optional().additionalProperties(new CG.str()).exportAs('IDataModelBindingsForList'))
  .addProperty(
    new CG.prop(
      'tableHeaders',
      new CG.obj()
        .additionalProperties(new CG.str())
        .setTitle('Table Headers')
        .setDescription(
          'An object where the fields in the datalist is mapped to headers. Must correspond to datalist ' +
            'representing a row. Can be added to the resource files to change between languages.',
        )
        .addExample({
          productId: 'product.id',
          description: 'Beskrivelse av produkt',
        }),
    ),
  )
  .addProperty(
    new CG.prop(
      'sortableColumns',
      new CG.arr(new CG.str())
        .optional()
        .setTitle('Sortable columns')
        .setDescription(
          'An array of column keys that can be sorted (note that your API backend needs to support this as well). ' +
            'The column has to be represented by the the header name that is written in tableHeaders.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'pagination',
      new CG.obj(
        new CG.prop(
          'alternatives',
          new CG.arr(new CG.num())
            .setTitle('Alternatives')
            .setDescription(
              'List of page sizes the user can choose from. Make sure to test the performance ' +
                'of the largest number of items per page you are allowing.',
            ),
        ),
        new CG.prop(
          'default',
          new CG.num().setTitle('Default').setDescription('The pagination size that is set to default.'),
        ),
      )
        .optional()
        .setTitle('Pagination')
        .setDescription('Pagination settings. Set this to enable pagination (must be supported by backend).')
        .exportAs('IPagination'),
    ),
  )
  .addProperty(
    new CG.prop(
      'dataListId',
      new CG.str()
        .setTitle('Data list ID')
        .setDescription('The ID of the data list to use (must be implemented in your backend).'),
    ),
  )
  .addProperty(
    new CG.prop(
      'secure',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Secure')
        .setDescription('Boolean value indicating if the options should be instance aware. Defaults to false.'),
    ),
  )
  .addProperty(new CG.prop('mapping', CG.common('IMapping').optional()))
  .addProperty(
    new CG.prop(
      'bindingToShowInSummary',
      new CG.str()
        .optional()
        .setTitle('Binding to show in summary')
        .setDescription(
          'The value of this binding will be shown in the summary component for the list. This binding must be one ' +
            'of the specified bindings under dataModelBindings.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'tableHeadersMobile',
      new CG.arr(new CG.str())
        .optional()
        .setTitle('Table Headers Mobile')
        .setDescription('An array of strings representing the columns that is chosen to be shown in the mobile view.'),
    ),
  );
