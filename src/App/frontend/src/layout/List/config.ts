import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Liste', en: 'List' },
    lifecycle: { status: 'stable' },
  },
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
  },
})
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'))
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'group',
        new CG.dataModelBinding()
          .setTitle('group binding', 'gruppebinding')
          .setDescription(
            'Dot notation location for a repeating structure (array of objects), where you want to save the content of checked checkboxes',
            'Plassering i punktnotasjon for den repeterende strukturen der verdiene fra avkryssede bokser skal lagres.',
          )
          .optional(),
      ),
      new CG.prop(
        'checked',
        new CG.dataModelBinding()
          .setTitle('checked', 'valgt')
          .setDescription(
            'If deletionStrategy=soft and group is set, this value points to where you want to save deleted status.',
            'Hvis deletionStrategy er soft og group er satt, peker verdien til feltet der slettestatusen skal lagres.',
          )
          .optional(),
      ),
    )
      .optional()
      .additionalProperties(new CG.dataModelBinding().optional())
      .exportAs('IDataModelBindingsForList'),
  )
  .addProperty(new CG.prop('deletionStrategy', new CG.enum('soft', 'hard').optional()))
  .addProperty(
    new CG.prop(
      'tableHeaders',
      new CG.obj()
        .additionalProperties(new CG.str())
        .setTitle('Table Headers', 'Tabelloverskrifter')
        .setDescription(
          'An object where the fields in the datalist is mapped to headers. Must correspond to datalist ' +
            'representing a row. Can be added to the resource files to change between languages.',
          'Kobler feltene i datalisten til kolonneoverskrifter.',
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
        .setTitle('Sortable columns', 'Sorterbare kolonner')
        .setDescription(
          'An array of column keys that can be sorted (note that your API backend needs to support this as well). ' +
            'The column has to be represented by the the header name that is written in tableHeaders.',
          'Liste over kolonnenøkler som kan sorteres. API-et i backend må også støtte sortering.',
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
            .setTitle('Alternatives', 'Alternativer')
            .setDescription(
              'List of page sizes the user can choose from. Make sure to test the performance ' +
                'of the largest number of items per page you are allowing.',
              'Liste over sidestørrelsene brukeren kan velge. Test ytelsen med høyeste tillatte verdi.',
            ),
        ),
        new CG.prop(
          'default',
          new CG.num()
            .setTitle('Default', 'Standard')
            .setDescription('The pagination size that is set to default.', 'Sidestørrelsen som brukes som standard.'),
        ),
      )
        .optional()
        .setTitle('Pagination', 'Paginering')
        .setDescription(
          'Pagination settings. Set this to enable pagination (must be supported by backend).',
          'Innstillinger for paginering. Egenskapen slår på paginering, som også må støttes av backend.',
        )
        .exportAs('IPagination'),
    ),
  )
  .addProperty(
    new CG.prop(
      'dataListId',
      new CG.str()
        .setTitle('Data list ID', 'Dataliste-ID')
        .setDescription(
          'The ID of the data list to use (must be implemented in your backend).',
          'ID-en til datalisten som skal brukes. Datalisten må være implementert i backend.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'secure',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Secure', 'Sikker')
        .setDescription(
          'Boolean value indicating if the options should be instance aware. Defaults to false.',
          'Angir om alternativene skal tilpasses instansen.',
        ),
    ),
  )
  .addProperty(new CG.prop('queryParameters', CG.common('IQueryParameters').optional()))
  .addProperty(
    new CG.prop(
      'summaryBinding',
      new CG.str()
        .optional()
        .setTitle('Data model binding to show in summary', 'Datamodellbinding som vises i oppsummeringen')
        .setDescription(
          'Specify one of the keys in the `dataModelBindings` object to show in the summary component for the list.',
          'Angi en av nøklene i dataModelBindings-objektet som skal vises i oppsummeringen av listen.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'tableHeadersMobile',
      new CG.arr(new CG.str())
        .optional()
        .setTitle('Table Headers Mobile', 'Tabelloverskrifter på mobil')
        .setDescription(
          'An array of strings representing the columns that is chosen to be shown in the mobile view.',
          'En liste over kolonnene som skal vises i mobilvisningen.',
        ),
    ),
  )
  .addSummaryOverrides();
