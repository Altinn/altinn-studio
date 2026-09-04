import type { LocalizedText } from '@app/layout-contract';
import type { JSONSchema7 } from 'json-schema';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { DEFAULT_DEBOUNCE_TIMEOUT } from 'src/features/formData/types';
import type { MaybeOptionalCodeGenerator, MaybeSymbolizedCodeGenerator } from 'src/codegen/CodeGenerator';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';

const common = {
  IButtonProps: () =>
    new CG.obj(
      new CG.prop(
        'size',
        new CG.enum('sm', 'md', 'lg')
          .optional({ default: 'md' })
          .setTitle('Size', 'Størrelse')
          .setDescription(
            'The size of the button. Only effective using style of primary or secondary',
            'Knappens størrelse. Har bare effekt når stilen er primary eller secondary.',
          )
          .exportAs('ButtonSize'),
      ),
      new CG.prop(
        'textAlign',
        new CG.enum('left', 'center', 'right')
          .optional({ default: 'center' })
          .setTitle('Text Align', 'Tekstjustering')
          .setDescription(
            'Text align when using style of primary or secondary.',
            'Justerer teksten når stilen er primary eller secondary.',
          )
          .exportAs('ButtonTextAlign'),
      ),
      new CG.prop(
        'fullWidth',
        new CG.bool()
          .optional()
          .setTitle('Full width', 'Full bredde')
          .setDescription(
            'Whether a link button should expand to full width',
            'Angir om en lenkeknapp skal fylle hele bredden.',
          ),
      ),
      new CG.prop(
        'position',
        new CG.enum('left', 'center', 'right')
          .optional()
          .setTitle('Position', 'Plassering')
          .setDescription(
            'Position the button left, center or right on the screen.',
            'Plasserer knappen til venstre, i midten eller til høyre på skjermen.',
          )
          .exportAs('ButtonPosition'),
      ),
    ),
  ISummaryOverridesCommon: () =>
    new CG.obj(new CG.prop('hidden', new CG.bool().optional()), new CG.prop('emptyFieldText', new CG.str().optional())),
  ILayoutFile: () =>
    new CG.obj(
      new CG.prop('$schema', new CG.str().optional()),
      new CG.prop(
        'data',
        new CG.obj(
          new CG.prop(
            'layout',
            new CG.arr(
              new CG.raw({
                typeScript: new CG.import({
                  import: 'CompExternal',
                  from: '@app/layout-contract/generated/components.generated',
                }),
                jsonSchema: () => ({
                  $ref: '#/definitions/AnyComponent',
                }),
              }),
            ),
          ),
          new CG.prop(
            'hidden',
            new CG.expr(ExprVal.Boolean)
              .setTitle('Hidden', 'Skjult')
              .setDescription(
                'Expression that will hide the page/form layout if true',
                'Uttrykk som skjuler siden eller skjemalayouten når resultatet er true.',
              )
              .optional({ default: false }),
          ),
          new CG.prop(
            'expandedWidth',
            new CG.bool()
              .optional({ default: false })
              .setTitle('Expanded width', 'Utvidet bredde')
              .setDescription('Sets expanded width for pages', 'Viser sidene med utvidet bredde.'),
          ),
          new CG.prop('validationOnNavigation', CG.common('PageValidation').optional()),
        ),
      ),
    )
      .setTitle('Altinn layout', 'Altinn-layout')
      .setDescription(
        'Schema that describes the layout configuration for Altinn applications.',
        'Skjemaet som beskriver layoutkonfigurasjonen for Altinn-apper.',
      ),

  ILabelSettings: () =>
    new CG.obj(
      new CG.prop(
        'optionalIndicator',
        new CG.bool()
          .setTitle('Optional indicator', 'Markering av valgfritt felt')
          .setDescription('Show optional indicator on label', 'Viser en markering for valgfrie felt ved ledeteksten.')
          .optional(),
      ),
    )
      .setTitle('Label settings', 'Innstillinger for ledetekst')
      .setDescription(
        'Controls how the component label is displayed.',
        'Styrer hvordan ledeteksten til komponenten vises.',
      ),

  IPageBreak: () =>
    new CG.obj(
      new CG.prop(
        'breakBefore',
        new CG.expr(ExprVal.String)
          .optional({ default: 'auto' })
          .setTitle('Page break before', 'Sideskift før')
          .setDescription(
            "PDF only: Indicates whether to insert a page break before the component. Can be 'auto', 'always', or 'avoid'.",
            "For PDF: Angir om det skal settes inn et sideskift før komponenten. Verdien kan være 'auto', 'always' eller 'avoid'.",
          )
          .addExample('auto', 'always', 'avoid'),
      ),
      new CG.prop(
        'breakAfter',
        new CG.expr(ExprVal.String)
          .optional({ default: 'auto' })
          .setTitle('Page break after', 'Sideskift etter')
          .setDescription(
            "PDF only: Indicates whether to insert a page break after the component. Can be 'auto', 'always', or 'avoid'.",
            "For PDF: Angir om det skal settes inn et sideskift etter komponenten. Verdien kan være 'auto', 'always' eller 'avoid'.",
          )
          .addExample('auto', 'always', 'avoid'),
      ),
    )
      .setTitle('Page break', 'Sideskift')
      .setDescription(
        'Settings for optional page breaks before or after the component when rendered in PDF.',
        'Innstillinger for valgfrie sideskift før eller etter komponenten når den vises i PDF.',
      ),

  LayoutStyle: () =>
    new CG.enum('column', 'row', 'table')
      .asRealEnum((value) => value.charAt(0).toUpperCase() + value.slice(1))
      .setTitle('Layout', 'Layout')
      .setDescription('Define the layout style for the options', 'Angir hvordan alternativene skal plasseres.'),

  // Grid styling:
  IGridSize: () => new CG.union(new CG.const('auto'), new CG.enum(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)),
  IGridStyling: () =>
    new CG.obj(
      new CG.prop('xs', CG.common('IGridSize').optional({ default: 'auto' })),
      new CG.prop('sm', CG.common('IGridSize').optional({ default: 'auto' })),
      new CG.prop('md', CG.common('IGridSize').optional({ default: 'auto' })),
      new CG.prop('lg', CG.common('IGridSize').optional({ default: 'auto' })),
    ),
  IGrid: () =>
    new CG.obj(
      new CG.prop(
        'labelGrid',
        CG.common('IGridStyling')
          .optional()
          .setDescription('Column widths for the label.', 'Kolonnebredder for ledeteksten.'),
      ),
      new CG.prop(
        'innerGrid',
        CG.common('IGridStyling')
          .optional()
          .setDescription('Column widths for the content.', 'Kolonnebredder for innholdet.'),
      ),
      new CG.prop(
        'validationGrid',
        CG.common('IGridStyling')
          .optional()
          .setTitle('Validation grid', 'Valideringsrutenett')
          .setDescription(
            'Column widths for validation messages. Uses the same area as innerGrid and defaults to innerGrid when omitted.',
            'Kolonnebredder for valideringsmeldinger. Bruker samme område som innerGrid og arver verdien når egenskapen ikke er satt.',
          ),
      ),
    )
      .extends(CG.common('IGridStyling'))
      .setTitle('Grid', 'Rutenett')
      .setDescription(
        "Grid settings controlling the component's horizontal placement and width.",
        'Rutenettinnstillinger som styrer komponentens horisontale plassering og bredde.',
      ),

  IDataModelReference: () =>
    new CG.obj(
      new CG.prop(
        'dataType',
        new CG.str()
          .setTitle('Data type', 'Datatype')
          .setDescription(
            'The name of the datamodel type to reference',
            'Navnet på datamodelltypen det skal refereres til.',
          ),
      ),
      new CG.prop(
        'field',
        new CG.str()
          .setTitle('Field', 'Felt')
          .setDescription('The path to the property using dot-notation', 'Stien til egenskapen i punktnotasjon.'),
      ),
    ),
  IRawDataModelBinding: () => new CG.union(new CG.str(), CG.common('IDataModelReference')),

  // Data model bindings:
  IDataModelBindingsSimple: () =>
    new CG.obj(
      new CG.prop(
        'simpleBinding',
        new CG.dataModelBinding()
          .setTitle('Data model binding', 'Datamodellbinding')
          .setDescription(
            'Describes the location in the data model where the component should store its value(s). ' +
              'A simple binding is used for components that only store a single value, usually a string.',
            'Angir hvor i datamodellen komponenten skal lagre verdien. En enkel binding brukes for komponenter som lagrer én verdi, vanligvis en streng.',
          ),
      ),
    ),
  IDataModelBindingsOptionsSimple: () =>
    new CG.obj(
      new CG.prop(
        'simpleBinding',
        new CG.dataModelBinding()
          .setTitle('Data model binding for value', 'Datamodellbinding for verdi')
          .setDescription(
            'Describes the location in the data model where the component should store its values.',
            'Angir hvor i datamodellen komponenten skal lagre verdiene.',
          ),
      ),
      new CG.prop(
        'label',
        new CG.dataModelBinding()
          .setTitle('Data model binding for label', 'Datamodellbinding for ledetekst')
          .setDescription(
            'Describes the location in the data model where the component should store its labels',
            'Angir hvor i datamodellen komponenten skal lagre ledetekstene.',
          )
          .optional(),
      ),
      new CG.prop(
        'metadata',
        new CG.dataModelBinding()
          .setTitle('Data model binding for metadata', 'Datamodellbinding for metadata')
          .setDescription(
            'Describes the location in the data model where the component should store its metadata',
            'Angir hvor i datamodellen komponenten skal lagre metadata.',
          )
          .optional(),
      ),
    ),
  IDataModelBindingsLikert: () =>
    new CG.obj(
      new CG.prop(
        'answer',
        new CG.dataModelBinding()
          .setTitle('Data model binding for answer', 'Datamodellbinding for svar')
          .setDescription(
            'Dot notation location for the answers. This must point to a property of the objects inside the ' +
              'question array. The answer for each question will be stored in the answer property of the ' +
              'corresponding question object.',
            'Plassering i punktnotasjon for svarene. Må peke på en egenskap i objektene i spørsmålslisten.',
          ),
      ),
      new CG.prop(
        'questions',
        new CG.dataModelBinding()
          .setTitle('Data model binding for questions', 'Datamodellbinding for spørsmål')
          .setDescription(
            'Dot notation location for a likert structure (array of objects), where the data is stored',
            'Plassering i punktnotasjon for Likert-strukturen, en liste med objekter, der dataene lagres.',
          ),
      ),
    ),
  IDataModelBindingsList: () =>
    new CG.obj(
      new CG.prop(
        'list',
        new CG.dataModelBinding()
          .setTitle('Data model binding for values', 'Datamodellbinding for verdier')
          .setDescription(
            'Describes the location in the data model where the component should store its values. A list binding ' +
              'should be pointed to an array structure in the data model, and is used for components that store multiple ' +
              'simple values (e.g. a list of strings).',
            'Angir hvor i datamodellen komponenten skal lagre verdiene. En listebinding brukes for komponenter som lagrer flere enkle verdier.',
          ),
      ),
    ),

  // Text resource bindings:
  TRBSummarizable: () =>
    makeTRB({
      summaryTitle: {
        title: { en: 'Summary title', nb: 'Tittel i oppsummering' },
        description: {
          en: 'Title used in the summary view (overrides the default title)',
          nb: 'Tittelen som vises i oppsummeringen. Overstyrer den vanlige tittelen.',
        },
      },
      summaryAccessibleTitle: {
        title: { en: 'Accessible summary title', nb: 'Tilgjengelig tittel i oppsummering' },
        description: {
          en: 'Title used for aria-label on the edit button in the summary view (overrides the default and summary title)',
          nb: 'Tittelen som brukes i aria-label på redigeringsknappen i oppsummeringen. Overstyrer både den vanlige tittelen og oppsummeringstittelen.',
        },
      },
    }),
  TRBFormComp: () =>
    makeTRB({
      tableTitle: {
        title: { en: 'Table title', nb: 'Tittel i tabellvisning' },
        description: {
          en: 'Title used in the table view (overrides the default title)',
          nb: 'Tittelen som vises i tabellvisningen. Overstyrer den vanlige tittelen.',
        },
      },
      shortName: {
        title: { en: 'Short name (for validation)', nb: 'Kortnavn for validering' },
        description: {
          en: 'Alternative name used for required validation messages (overrides the default title)',
          nb: 'Alternativt navn i valideringsmeldinger for påkrevde felt. Overstyrer den vanlige tittelen.',
        },
      },
      requiredValidation: {
        title: { en: 'Required validation message', nb: 'Valideringsmelding for påkrevd felt' },
        description: {
          en: 'Full validation message shown when the component is required and no value has been entered (overrides both the default and shortName)',
          nb: 'Hele valideringsmeldingen som vises når komponenten er påkrevd og mangler verdi. Overstyrer både standardmeldingen og kortnavnet.',
        },
      },
    }),
  TRBLabel: () =>
    makeTRB({
      title: {
        title: { en: 'Title', nb: 'Ledetekst' },
        description: {
          en: 'Label text/title shown above the component',
          nb: 'Ledeteksten eller tittelen som vises over komponenten.',
        },
      },
      description: {
        title: { en: 'Description', nb: 'Beskrivelse' },
        description: {
          en: 'Label description shown above the component, below the title',
          nb: 'Beskrivelsen som vises mellom ledeteksten og komponenten.',
        },
      },
      help: {
        title: { en: 'Help text', nb: 'Hjelpetekst' },
        description: {
          en: 'Help text shown in a tooltip when clicking the help button',
          nb: 'Hjelpeteksten som vises når brukeren åpner hjelpeknappen.',
        },
      },
    }),

  // Options/code lists:
  IRawOption: () =>
    new CG.obj(
      new CG.prop(
        'label',
        new CG.str()
          .setTitle('Option label', 'Ledetekst for alternativ')
          .setDescription('The text displayed for the option.', 'Teksten som vises for alternativet.'),
      ),
      new CG.prop(
        'value',

        // Options are converted to strings when working on them internally, but externally we can handle
        // receiving them as any primitive type
        new CG.union(new CG.str(), new CG.num(), new CG.bool(), CG.null)
          .setTitle('Option value', 'Alternativverdi')
          .setDescription(
            'The value stored when the option is selected.',
            'Verdien som lagres når alternativet velges.',
          ),
      ),
      new CG.prop(
        'description',
        new CG.str()
          .optional()
          .setTitle('Option description', 'Beskrivelse av alternativ')
          .setDescription('Additional text displayed with the option.', 'Utfyllende tekst som vises med alternativet.'),
      ),
      new CG.prop(
        'helpText',
        new CG.str()
          .optional()
          .setTitle('Option help text', 'Hjelpetekst for alternativ')
          .setDescription('Help text for the option.', 'Hjelpetekst for alternativet.'),
      ),
    )
      .setTitle('Option', 'Alternativ')
      .setDescription('Defines one selectable option.', 'Definerer ett valgbart alternativ.')
      .addExample({ label: '', value: '' }),
  IMapping: () =>
    new CG.obj()
      .additionalProperties(new CG.str())
      .setTitle('Mapping', 'Kobling')
      .setDescription(
        'A mapping of key-value pairs (usually used for mapping a path in the data model to a query string parameter).',
        'En samling nøkkel/verdi-par, vanligvis brukt til å koble en sti i datamodellen til en parameter i spørringsstrengen.',
      ),
  IQueryParameters: () =>
    new CG.obj()
      .additionalProperties(new CG.expr(ExprVal.String))
      .setTitle('Query parameters', 'Spørringsparametere')
      .setDescription(
        'A mapping of query string parameters to values. Will be appended to the URL when fetching options.',
        'Kobler parametere i spørringsstrengen til verdier. Parameterne legges til URL-en når alternativer hentes.',
      ),
  IOptionSource: () =>
    new CG.obj(
      new CG.prop(
        'dataType',
        new CG.str()
          .setTitle('Data type', 'Datatype')
          .setDescription(
            'The datamodel where the repeating group data is stored. If not specified, the data model defined in the layout-set will be used.',
            'Datamodellen der dataene til den repeterende gruppen lagres. Hvis den ikke er angitt, brukes datamodellen fra layout-settet.',
          )
          .optional(),
      ),
      new CG.prop(
        'group',
        new CG.str()
          .setTitle('Group', 'Gruppe')
          .setDescription(
            'The repeating group to base options on.',
            'Den repeterende gruppen som alternativene skal bygges fra.',
          )
          .addExample('model.some.group'),
      ),
      new CG.prop(
        'label',
        new CG.expr(ExprVal.String)
          .setTitle('Label', 'Ledetekst')
          .setDescription(
            'A label of the option displayed in Radio- and Checkbox groups. Can be plain text, a text resource binding, or a dynamic expression.',
            'Ledetekst for alternativet som vises i grupper med radioknapper og avkrysningsbokser. Kan være ren tekst, en tekstressursbinding eller et dynamisk uttrykk.',
          )
          .addExample('some.text.key'),
      ),
      new CG.prop(
        'value',
        new CG.str()
          .setTitle('Value', 'Verdi')
          .setDescription(
            'Field in the group that should be used as value',
            'Feltet i gruppen som skal brukes som verdi.',
          )
          .addExample('model.some.group[{0}].someField'),
      ),
      new CG.prop(
        'description',
        new CG.expr(ExprVal.String)
          .optional()
          .setTitle('Description', 'Beskrivelse')
          .setDescription(
            'A description of the option displayed in Radio- and Checkbox groups. Can be plain text, a text resource binding, or a dynamic expression.',
            'Beskrivelse av alternativet som vises i grupper med radioknapper og avkrysningsbokser. Kan være ren tekst, en tekstressursbinding eller et dynamisk uttrykk.',
          )
          .addExample('some.text.key', 'My Description'),
      ),
      new CG.prop(
        'helpText',
        new CG.expr(ExprVal.String)
          .optional()
          .setTitle('Help Text', 'Hjelpetekst')
          .setDescription(
            'A help text for the option displayed in Radio- and Checkbox groups. Can be plain text, a text resource binding, or a dynamic expression.',
            'Hjelpetekst for alternativet som vises i grupper med radioknapper og avkrysningsbokser. Kan være ren tekst, en tekstressursbinding eller et dynamisk uttrykk.',
          )
          .addExample('some.text.key', 'My Help Text'),
      ),
    )
      .setTitle('Option source', 'Kilde for alternativer')
      .setDescription(
        'Allows for fetching options from the data model, pointing to a repeating group structure',
        'Henter alternativer fra en repeterende gruppestruktur i datamodellen.',
      ),
  ISelectionComponent: () =>
    new CG.obj(
      new CG.prop(
        'optionsId',
        new CG.str()
          .optional()
          .setTitle('Dynamic options (fetched from server)', 'Dynamiske alternativer fra serveren')
          .setDescription(
            'ID of the option list to fetch from the server',
            'ID-en til listen med alternativer som skal hentes fra serveren.',
          ),
      ),
      new CG.prop(
        'queryParameters',
        CG.common('IQueryParameters')
          .optional()
          .setTitle('Query parameters', 'Spørringsparametere')
          .setDescription(
            'A mapping of query string parameters to values. Will be appended to the URL when fetching options.',
            'Kobler parametere i spørringsstrengen til verdier. Parameterne legges til URL-en når alternativer hentes.',
          ),
      ),
      new CG.prop(
        'options',
        new CG.arr(CG.common('IRawOption'))
          .optional()
          .setTitle('Static options', 'Statiske alternativer')
          .setDescription('List of static options', 'Liste over statiske alternativer.'),
      ),
      new CG.prop(
        'secure',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Secure options (when using optionsId)', 'Sikre alternativer med optionsId')
          .setDescription(
            'Whether to call the secure API endpoint when fetching options from the ' +
              'server (allows for user/instance-specific options)',
            'Angir om det sikre API-endepunktet skal brukes når alternativer hentes fra serveren.',
          ),
      ),
      new CG.prop(
        'sortOrder',
        new CG.enum('asc', 'desc')
          .setDescription(
            'Sorts the code list in either ascending or descending order by label.',
            'Sorterer kodelisten stigende eller synkende etter ledetekst.',
          )
          .optional(),
      ),
      new CG.prop('source', CG.common('IOptionSource').optional()),
      new CG.prop(
        'optionFilter',
        new CG.expr(ExprVal.Boolean)
          .optional()
          .setTitle('Filter options (using an expression)', 'Filtrer alternativer med et uttrykk')
          .setDescription(
            'Setting this to an expression allows you to filter the list of options (the expression should return true to keep the option, false to remove it). To get the option value, use ["value"]. You can also use ["value", "label"] to get the label text resource id, likewise also "description" and "helpText".',
            'Filtrerer listen med alternativer ved hjelp av et uttrykk. Uttrykket skal returnere true for å beholde alternativet og false for å fjerne det. Bruk ["value"] for verdien og ["value", "label"] for tekstressurs-ID-en. Tilsvarende gjelder «description» og «helpText».',
          ),
      ),
    ),
  ISelectionComponentFull: () =>
    new CG.obj(
      new CG.prop(
        'preselectedOptionIndex',
        new CG.int()
          .optional()
          .setTitle('Preselected option index', 'Indeks for forhåndsvalgt alternativ')
          .setDescription(
            'Index of the option to preselect (if no option has been selected yet)',
            'Indeksen til alternativet som skal være forhåndsvalgt når brukeren ikke har valgt noe.',
          ),
      ),
    ).extends(CG.common('ISelectionComponent')),

  IGridColumnProperties: () =>
    new CG.obj(
      new CG.prop(
        'colSpan',
        new CG.expr(ExprVal.Number)
          .optional()
          .setTitle('Column span', 'Kolonnespenn')
          .setDescription(
            'Number of columns this cell should span. Defaults to 1 if not set.',
            'Antall kolonner cellen skal spenne over. Standardverdien er 1.',
          ),
      ),
    )
      .setTitle('Grid column properties', 'Egenskaper for rutenettkolonne')
      .setDescription(
        'Additional properties for columns in the Grid component',
        'Flere egenskaper for kolonner i Grid-komponenten.',
      ),

  // Table configuration:
  ITableColumnsAlignText: () =>
    new CG.enum('left', 'center', 'right')
      .setTitle('Align Text', 'Tekstjustering')
      .setDescription(
        "Choose text alignment between 'left', 'center', or 'right' for text in table cells. Defaults to 'left' for text and 'right' for numbers.",
        'Angir om teksten i tabellceller skal venstrejusteres, midtstilles eller høyrejusteres. Standard er venstrejustering for tekst og høyrejustering for tall.',
      ),
  ITableColumnsTextOverflow: () =>
    new CG.obj(
      new CG.prop(
        'lineWrap',
        new CG.bool()
          .optional({ default: true })
          .setTitle('Line Wrap', 'Tekstbryting')
          .setDescription(
            'Toggle line wrapping on or off. Defaults to true',
            'Slår tekstbryting av eller på. Standardverdien er true.',
          ),
      ),
      new CG.prop(
        'maxHeight',
        new CG.num()
          .optional({ default: 2 })
          .setTitle('Max Height', 'Maksimal høyde')
          .setDescription(
            'Determines the number of lines to display in table cell before hiding the rest of the ' +
              'text with an ellipsis (...). Defaults to 2.',
            'Angir hvor mange linjer som vises i en tabellcelle før resten skjules med ellipse.',
          ),
      ),
    ),
  ITableColumnFormatting: () => new CG.obj().additionalProperties(CG.common('ITableColumnProperties')),
  ITableColumnProperties: () =>
    new CG.obj(
      new CG.prop(
        'width',
        new CG.str()
          .optional({ default: 'auto' })
          .setTitle('Width', 'Bredde')
          .setDescription(
            "Width of cell in % or 'auto'. Defaults to 'auto'",
            'Bredden på cellen i prosent eller «auto». Standardverdien er «auto».',
          )
          .setPattern(/^([0-9]{1,2}%|100%|auto)$/),
      ),
      new CG.prop('alignText', CG.common('ITableColumnsAlignText').optional()),
      new CG.prop('textOverflow', CG.common('ITableColumnsTextOverflow').optional()),
      new CG.prop(
        'hidden',
        new CG.expr(ExprVal.Boolean)
          .optional({ default: false })
          .setTitle('Hidden column?', 'Skjult kolonne')
          .setDescription(
            'Expression or boolean indicating whether each column should be hidden. An expression will be evaluated per ' +
              'column, and if it evaluates to true, the column will be hidden.',
            'Uttrykk eller boolsk verdi som angir om hver kolonne skal skjules.',
          ),
      ),
    )
      .setTitle('Column options', 'Kolonneinnstillinger')
      .setDescription('Options for the row/column', 'Innstillinger for raden eller kolonnen.')
      .addExample({
        width: 'auto',
        alignText: 'left',
        textOverflow: {
          lineWrap: true,
          maxHeight: 2,
        },
      }),
  ILikertColumnProperties: () =>
    new CG.obj(
      new CG.prop(
        'columns',
        new CG.arr(
          new CG.obj(
            new CG.prop(
              'value',
              new CG.union(new CG.str().setPattern(/^\d+$/), new CG.num())
                .setTitle('Value', 'Verdi')
                .setDescription('The value of the answer column', 'Verdien i svarkolonnen.'),
            ),
            new CG.prop(
              'divider',
              new CG.enum('before', 'after', 'both')
                .setTitle('Divider', 'Skillelinje')
                .setDescription(
                  "Choose if the divider should be shown 'before', 'after' or on 'both' sides of the column.",
                  'Angir om skillelinjen skal vises før, etter eller på begge sider av kolonnen.',
                )
                .optional(),
            ),
          ),
        )
          .optional()
          .setTitle('Columns', 'Kolonner')
          .setDescription(
            'Add customization to the columns of the likert component',
            'Tilpasser kolonnene i Likert-komponenten.',
          ),
      ),
    ),
  // Types that component definitions extend:
  ComponentBase: () =>
    new CG.obj(
      new CG.prop(
        'id',
        new CG.str()
          .setPattern(/^[0-9a-zA-Z][0-9a-zA-Z-]*(-?[a-zA-Z]+|[a-zA-Z][0-9]+|-[0-9]{6,})$/)
          .setTitle('ID', 'ID')
          .setDescription(
            'The component ID. It must be unique across all pages in a layout set and cannot end with a dash followed by a number.',
            'Komponent-ID-en. Den må være unik på tvers av alle sider i et layout-sett og kan ikke slutte med bindestrek etterfulgt av et tall.',
          ),
      ),
      new CG.prop(
        'hidden',
        new CG.expr(ExprVal.Boolean)
          .optional({ default: false })
          .setTitle('Hidden', 'Skjult')
          .setDescription(
            'Boolean value or expression indicating whether the component should be hidden.',
            'Boolsk verdi eller uttrykk som angir om komponenten skal skjules.',
          ),
      ),
      new CG.prop('grid', CG.common('IGrid').optional()),
      new CG.prop('pageBreak', CG.common('IPageBreak').optional()),
    ),
  FormComponentProps: () =>
    new CG.obj(
      new CG.prop(
        'readOnly',
        new CG.expr(ExprVal.Boolean)
          .optional({ default: false })
          .setTitle('Read only/disabled?', 'Skrivebeskyttet/deaktivert')
          .setDescription(
            'Boolean value or expression indicating if the component should be read only/disabled. Defaults to false. <br /> <i>Please note that even with read-only fields in components, it may currently be possible to update the field by modifying the request sent to the API or through a direct API call.<i/>',
            'Boolsk verdi eller uttrykk som angir om komponenten skal være skrivebeskyttet eller deaktivert. Selv skrivebeskyttede felt kan foreløpig endres ved å manipulere API-kallet.',
          ),
      ),
      new CG.prop(
        'required',
        new CG.expr(ExprVal.Boolean)
          .optional({ default: false })
          .setTitle('Required?', 'Påkrevd')
          .setDescription(
            'Boolean value or expression indicating if the component should be required. Defaults to false.',
            'Boolsk verdi eller uttrykk som angir om komponenten skal være påkrevd.',
          ),
      ),
      new CG.prop('showValidations', CG.common('AllowedValidationMasks').optional()),
    ),
  SummarizableComponentProps: () =>
    new CG.obj(
      new CG.prop(
        'renderAsSummary',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Render as summary', 'Vis som oppsummering')
          .setDescription(
            'Boolean value indicating if the component should be rendered as a summary. Defaults to false.',
            'Angir om komponenten skal vises som en oppsummering.',
          ),
      ),
      new CG.prop(
        'forceShowInSummary',
        new CG.expr(ExprVal.Boolean)
          .optional({ default: false })
          .setTitle('Force show in summary', 'Tving visning i oppsummering')
          .setDescription(
            'Will force show the component in a summary even if hideEmptyFields is set to true in the summary component.',
            'Tvinger komponenten til å vises i en oppsummering selv om hideEmptyFields er true i oppsummeringskomponenten.',
          ),
      ),
    ),
  LabeledComponentProps: () => new CG.obj(new CG.prop('labelSettings', CG.common('ILabelSettings').optional())),

  // Reusable Grid component properties (used by both Grid and repeating Group):
  GridComponentRef: () =>
    new CG.obj(
      new CG.prop(
        'component',
        new CG.str()
          .optional()
          .setTitle('Component ID', 'Komponent-ID')
          .setDescription('ID of the component', 'Komponentens ID.'),
      ),
      new CG.prop('columnOptions', CG.common('ITableColumnProperties').optional()),
      new CG.prop('cellStyle', CG.common('IGridColumnProperties').optional()),
    ).extends(CG.common('ITableColumnProperties')),
  GridCellLabelFrom: () =>
    new CG.obj(
      new CG.prop(
        'labelFrom',
        new CG.str()
          .setTitle('Fetch label from other component', 'Hent ledetekst fra en annen komponent')
          .setDescription(
            'Set this to a component id to display the label from that component',
            'Angi ID-en til en annen komponent for å vise ledeteksten fra den komponenten.',
          ),
      ),
      new CG.prop('columnOptions', CG.common('ITableColumnProperties').optional()),
      new CG.prop('cellStyle', CG.common('IGridColumnProperties').optional()),
    ).extends(CG.common('ITableColumnProperties')),
  GridCellText: () =>
    new CG.obj(
      new CG.prop(
        'text',
        new CG.str()
          .setTitle('Text', 'Tekst')
          .setDescription(
            'Text to display (can also be a key in text resources)',
            'Teksten som skal vises. Kan også være en nøkkel til en tekstressurs.',
          ),
      ),
      new CG.prop(
        'help',
        new CG.str()
          .optional()
          .setTitle('Help', 'Hjelp')
          .setDescription('Help text to display', 'Hjelpeteksten som skal vises.'),
      ),
      new CG.prop('columnOptions', CG.common('ITableColumnProperties').optional()),
      new CG.prop('cellStyle', CG.common('IGridColumnProperties').optional()),
    ).extends(CG.common('ITableColumnProperties')),
  GridCell: () =>
    new CG.union(CG.common('GridComponentRef'), CG.null, CG.common('GridCellText'), CG.common('GridCellLabelFrom')),
  GridRow: () =>
    new CG.obj(
      new CG.prop('header', new CG.bool().optional({ default: false }).setTitle('Is header row?', 'Er overskriftsrad')),
      new CG.prop(
        'readOnly',
        new CG.bool().optional({ default: false }).setTitle('Is row read-only?', 'Er raden skrivebeskyttet'),
      ),
      new CG.prop('columnOptions', CG.common('ITableColumnProperties').optional()),
      new CG.prop(
        'cells',
        new CG.arr(CG.common('GridCell'))
          .setTitle('Cells in table row', 'Celler i tabellraden')
          .setDescription('The list of cells in this row', 'Listen over cellene i raden.'),
      ),
    ),
  GridRows: () =>
    new CG.arr(CG.common('GridRow'))
      .setTitle('Rows in Grid or Grid-like component', 'Rader i Grid eller lignende komponent')
      .setDescription('The list of rows in this grid', 'Listen over radene i rutenettet.')
      .addExample([
        {
          header: false,
          readOnly: false,
          cells: [{ text: 'hello.world' }, { component: 'myOtherComponent' }],
        },
      ]),

  SaveWhileTyping: () =>
    new CG.num()
      .optional({ default: DEFAULT_DEBOUNCE_TIMEOUT })
      .setTitle('Automatic saving while typing', 'Automatisk lagring mens brukeren skriver')
      .setDescription(
        `Lets you control how long we wait before saving the value locally while typing. ` +
          `This value is usually also used to determine how long we wait before saving the value to the server. ` +
          `The default value is ${DEFAULT_DEBOUNCE_TIMEOUT} milliseconds.`,
        'Angir hvor lenge appen venter før den lagrer verdien mens brukeren skriver. Standardverdien er 400 millisekunder.',
      )
      .setTsComment(
        'Beware, this used to be a number OR boolean value in v3.\n' +
          'It can be smart to check the type of this value before using it.',
      ),

  HTMLAutoCompleteValues: () =>
    new CG.enum(
      ...['on', 'off', 'name', 'honorific-prefix', 'given-name', 'additional-name'],
      ...['family-name', 'honorific-suffix', 'nickname', 'email', 'username', 'new-password', 'current-password'],
      ...['one-time-code', 'organization-title', 'organization', 'street-address', 'address-line1', 'address-line2'],
      ...['address-line3', 'address-level4', 'address-level3', 'address-level2', 'address-level1', 'country'],
      ...['country-name', 'postal-code', 'cc-name', 'cc-given-name', 'cc-additional-name', 'cc-family-name'],
      ...['cc-number', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type', 'transaction-currency'],
      ...['transaction-amount', 'language', 'bday', 'bday-day', 'bday-month', 'bday-year', 'sex', 'tel'],
      ...['tel-country-code', 'tel-national', 'tel-area-code', 'tel-local', 'tel-extension', 'impp', 'url', 'photo'],
    )
      .setTitle('HTML autocomplete values', 'Verdier for HTML-autofullføring')
      .setDescription(
        'Autocomplete hints to the browser. See https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete',
        'Forslag til nettleserens autofullføring. Se https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete',
      ),

  HeadingLevel: () => new CG.enum(2, 3, 4, 5, 6),

  AllowedValidationMasks: () =>
    new CG.arr(
      new CG.enum('Schema', 'Component', 'Expression', 'CustomBackend', 'Required', 'AllExceptRequired', 'All'),
    )
      .setTitle('Validation types', 'Valideringstyper')
      .setDescription('List of validation types to show', 'Liste over valideringstypene som skal vises.'),

  PageValidation: () =>
    new CG.obj(
      new CG.prop(
        'page',
        new CG.enum('current', 'currentAndPrevious', 'all')
          .setTitle('Page', 'Side')
          .setDescription(
            'Which pages should be validated when the next button is clicked.',
            'Angir hvilke sider som skal valideres når brukeren velger neste-knappen.',
          ),
      ),
      new CG.prop('show', CG.common('AllowedValidationMasks')),
    ),

  // Layout settings:
  IComponentsSettings: () =>
    new CG.obj(
      new CG.prop(
        'excludeFromPdf',
        new CG.arr(new CG.str())
          .setTitle('Exclude from PDF', 'Utelat fra PDF')
          .setDescription(
            'List of components to exclude from the PDF generation',
            'Liste over komponenter som ikke skal tas med i PDF-en.',
          ),
      ),
    ),
  GlobalPageSettingsFromSchema: () =>
    new CG.obj(
      new CG.prop(
        'hideCloseButton',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Hide close button', 'Skjul lukkeknappen')
          .setDescription(
            'Hide the close button in the upper right corner of the app',
            'Skjuler lukkeknappen øverst til høyre i appen.',
          ),
      ),
      new CG.prop(
        'showLanguageSelector',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Show language selector', 'Vis språkvelger')
          .setDescription(
            'Show the language selector in the upper right corner of the app',
            'Viser språkvelgeren øverst til høyre i appen.',
          ),
      ),
      new CG.prop(
        'showExpandWidthButton',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Show expand width button', 'Vis knapp for utvidet bredde')
          .setDescription(
            'Show the expand width button in the upper right corner of the app',
            'Viser knappen for utvidet bredde øverst til høyre i appen.',
          ),
      ),
      new CG.prop(
        'expandedWidth',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Expanded width', 'Utvidet bredde')
          .setDescription('Sets expanded width for pages', 'Viser sidene med utvidet bredde.'),
      ),
      new CG.prop(
        'showProgress',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Show progress indicator', 'Vis fremdriftsindikator')
          .setDescription(
            'Enables a progress indicator in the upper right corner of the app (when on data tasks/forms)',
            'Viser en fremdriftsindikator øverst til høyre i appen under dataoppgaver og skjemaer.',
          ),
      ),
      new CG.prop(
        'autoSaveBehavior',
        new CG.enum('onChangeFormData', 'onChangePage')
          .optional({ default: 'onChangeFormData' })
          .setTitle('Auto save behavior', 'Automatisk lagring')
          .setDescription(
            'An attribute specifying when the application will save form data. onChangeFormData saves on every interaction with form elements. onChangePage saves on every page change.',
            'Angir når appen lagrer skjemadata. onChangeFormData lagrer ved hver endring i et skjemafelt. onChangePage lagrer ved hvert sidebytte.',
          ),
      ),
      new CG.prop(
        'navigationTitle',
        new CG.expr(ExprVal.String)
          .optional()
          .setTitle('Navigation title', 'Navigasjonstittel')
          .setDescription(
            'Overrides the default "Skjemasider" heading shown in the navigation panel. Can be a text resource key or a dynamic expression that reads from the data model.',
            'Overstyrer standardoverskriften «Skjemasider» i navigasjonspanelet. Kan være en tekstressursnøkkel eller et dynamisk uttrykk som leser fra datamodellen.',
          ),
      ),
      new CG.prop(
        'taskNavigation',
        new CG.arr(
          new CG.union(
            new CG.obj(
              new CG.prop('id', new CG.str()).omitInSchema(),
              new CG.prop('name', new CG.str().optional()),
              new CG.prop('taskId', new CG.str()),
            ).exportAs('NavigationTaskFromSchema'),
            new CG.obj(
              new CG.prop('id', new CG.str()).omitInSchema(),
              new CG.prop('name', new CG.str().optional()),
              new CG.prop('type', new CG.const('receipt')),
            ).exportAs('NavigationReceiptFromSchema'),
          ).setUnionType('discriminated'),
        )
          .optional({ default: [] })
          .setTitle('Task navigation settings', 'Innstillinger for oppgavenavigasjon')
          .setDescription(
            'Shows the listed tasks in the sidebar navigation menu',
            'Viser de oppgitte oppgavene i navigasjonsmenyen i sidepanelet.',
          ),
      ),
      new CG.prop('validationOnNavigation', CG.common('PageValidation').optional()),
      new CG.prop(
        'hideAppNameInPdf',
        new CG.expr(ExprVal.Boolean)
          .setTitle('Hide app name in PDF', 'Skjul appnavn i PDF')
          .setDescription(
            'Controls whether the app name is hidden in the PDF header and footer.',
            'Angir om appnavnet skal skjules i topp- og bunnteksten i PDF-en.',
          )
          .optional({ default: false }),
      ),
    ),
  IPagesBaseSettings: () =>
    new CG.obj(
      new CG.prop(
        'excludeFromPdf',
        new CG.arr(new CG.str())
          .optional()
          .setTitle('Exclude from PDF', 'Utelat fra PDF')
          .setDescription(
            'List of pages to exclude from the PDF generation',
            'Liste over sider som ikke skal tas med i PDF-en.',
          ),
      ),
      new CG.prop(
        'pdfLayoutName',
        new CG.str()
          .optional()
          .setTitle('PDF layout name', 'Navn på PDF-layout')
          .setDescription(
            'Name of a custom layout file to use for PDF creation instead of the automatically generated PDF.',
            'Navnet på en egendefinert layout som skal brukes til PDF-en i stedet for den automatisk genererte PDF-en.',
          ),
      ),
    ),
  INavigationBasePageGroup: () =>
    new CG.obj(
      new CG.prop('id', new CG.str()).omitInSchema(),
      new CG.prop('type', new CG.enum('default', 'info').optional({ default: 'default' })),
      new CG.prop(
        'markWhenCompleted',
        new CG.bool()
          .optional({ default: false })
          .setDescription(
            'Whether this group should mark pages as completed when the user finishes',
            'Angir om gruppen skal merke sider som fullført når brukeren er ferdig.',
          ),
      ),
      new CG.prop(
        'expandedByDefault',
        new CG.bool()
          .optional({ default: false })
          .setDescription(
            'Whether the sidebar group should be expanded by default',
            'Angir om sidepanelgruppen skal være utvidet som standard.',
          ),
      ),
    ),
  IPagesSettingsWithGroups: () =>
    new CG.obj(
      new CG.prop(
        'groups',
        new CG.arr(
          new CG.union(
            new CG.obj(new CG.prop('name', new CG.str()), new CG.prop('order', new CG.arr(new CG.str()).setMinItems(2)))
              .extends(CG.common('INavigationBasePageGroup'))
              .exportAs('NavigationPageGroupMultiple'),
            new CG.obj(new CG.prop('order', new CG.arr(new CG.str()).setMinItems(1).setMaxItems(1)))
              .extends(CG.common('INavigationBasePageGroup'))
              .exportAs('NavigationPageGroupSingle'),
          )
            .setUnionType('discriminated')
            .exportAs('NavigationPageGroup'),
        )
          .setTitle('Page groups', 'Sidegrupper')
          .setDescription(
            'List of page groups in the order they should appear in the application',
            'Liste over sidegruppene i rekkefølgen de skal vises i appen.',
          ),
      ),
    ).extends(CG.common('GlobalPageSettingsFromSchema'), CG.common('IPagesBaseSettings')),

  IPagesSettingsWithOrder: () =>
    new CG.obj(
      new CG.prop(
        'order',
        new CG.arr(new CG.str())
          .setTitle('Page order', 'Siderekkefølge')
          .setDescription(
            'List of pages in the order they should appear in the application',
            'Liste over sidene i rekkefølgen de skal vises i appen.',
          ),
      ),
    ).extends(CG.common('GlobalPageSettingsFromSchema'), CG.common('IPagesBaseSettings')),
  IPagesSettings: () =>
    new CG.union(CG.common('IPagesSettingsWithOrder'), CG.common('IPagesSettingsWithGroups')).setUnionType(
      'discriminated',
    ),
  ILayoutSettings: () =>
    new CG.obj(
      new CG.prop('$schema', new CG.str().optional()),
      new CG.prop('pages', CG.common('IPagesSettings')),
      new CG.prop('components', CG.common('IComponentsSettings').optional()),
      new CG.prop(
        'defaultDataType',
        new CG.str()
          .optional()
          .setTitle('Default data model', 'Standard datamodell')
          .setDescription(
            'The default data model type to be used for bindings not specifying a dataType in these layouts',
            'Standardtypen for datamodellen som brukes av bindinger uten dataType i disse layoutene.',
          ),
      ),
      new CG.prop(
        'type',
        new CG.str()
          .optional()
          .setTitle('Subform indicator', 'Underskjemamarkør')
          .setDescription(
            'Optional field used only in Altinn Studio Designer for subform layout sets. When set to "subform", the layout set is treated as a subform. For all other layout sets, this field is not required.',
            'Valgfritt felt som bare brukes av Altinn Studio Designer for layout-sett med underskjema. Verdien «subform» markerer layout-settet som et underskjema.',
          ),
      ),
    )
      .setTitle('Layout settings', 'Layoutinnstillinger')
      .setDescription(
        'Settings regarding layout pages and components',
        'Innstillinger for layoutsider og komponenter.',
      ),

  PatternFormatProps: () =>
    new CG.obj(
      new CG.prop('format', new CG.expr(ExprVal.String)),
      new CG.prop('mask', new CG.union(new CG.str(), new CG.arr(new CG.str())).optional()),
      new CG.prop('allowEmptyFormatting', new CG.bool().optional()),
      new CG.prop('patternChar', new CG.str().optional()),
    ),
  NumberFormatProps: () =>
    new CG.obj(
      new CG.prop(
        'thousandSeparator',
        new CG.union(new CG.expr(ExprVal.Boolean), new CG.expr(ExprVal.String)).optional(),
      ),
      new CG.prop('decimalSeparator', new CG.expr(ExprVal.String).optional()),
      new CG.prop('allowedDecimalSeparators', new CG.arr(new CG.str()).optional()),
      new CG.prop('thousandsGroupStyle', new CG.enum('thousand', 'lakh', 'wan', 'none').optional()),
      new CG.prop('decimalScale', new CG.num().optional()),
      new CG.prop('fixedDecimalScale', new CG.bool().optional()),
      new CG.prop('allowNegative', new CG.bool().optional()),
      new CG.prop('allowLeadingZeros', new CG.bool().optional()),
      new CG.prop('suffix', new CG.expr(ExprVal.String).optional()),
      new CG.prop('prefix', new CG.expr(ExprVal.String).optional()),
    )
      .setTitle('Number formatting options', 'Innstillinger for tallformat')
      .setDescription(
        'These options are sent directly to react-number-format in order to make it possible to format pretty numbers in the input field.',
        'Alternativene sendes direkte til react-number-format for å formatere tall i inndatafeltet.',
      ),
  IFormatting: () =>
    new CG.obj(
      // Newer Intl.NumberFormat options
      new CG.prop(
        'currency',
        new CG.enum(
          ...['AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN'],
          ...['BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BOV', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF'],
          ...['CHE', 'CHF', 'CHW', 'CLF', 'CLP', 'CNY', 'COP', 'COU', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF'],
          ...['DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD'],
          ...['GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HTG', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JMD'],
          ...['JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR'],
          ...['LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK'],
          ...['MXN', 'MXV', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK'],
          ...['PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK'],
          ...['SGD', 'SHP', 'SLE', 'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT'],
          ...['TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'USN', 'UYI', 'UYU', 'UYW', 'UZS'],
          ...['VED', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XDR', 'XOF', 'XPF', 'XSU', 'XUA', 'YER', 'ZAR'],
          ...['ZMW', 'ZWL'],
        )
          .optional()
          .setTitle('Language-sensitive currency formatting', 'Språktilpasset valutaformat')
          .setDescription(
            'Enables currency to be language sensitive based on selected app language. Note: parts that already exist in number property are not overridden by this prop.',
            'Tilpasser valutaformatet til språket som er valgt i appen. Deler som allerede finnes i number-egenskapen, blir ikke overstyrt.',
          ),
      ),
      new CG.prop(
        'unit',
        new CG.enum(
          ...['celsius', 'centimeter', 'day', 'degree', 'foot', 'gram', 'hectare', 'hour', 'inch', 'kilogram'],
          ...['kilometer', 'liter', 'meter', 'milliliter', 'millimeter', 'millisecond', 'minute', 'month'],
          ...['percent', 'second', 'week', 'year'],
        )
          .optional()
          .setTitle('Language-sensitive number formatting based on unit', 'Språktilpasset tallformat etter enhet')
          .setDescription(
            'Enables unit along with thousand and decimal separators to be language sensitive based on ' +
              'selected app language. They are configured in number property. Note: parts that already exist ' +
              'in number property are not overridden by this prop.',
            'Tilpasser enhet, tusenskilletegn og desimalskilletegn til språket som er valgt i appen.',
          ),
      ),
      new CG.prop(
        'position',
        new CG.enum('prefix', 'suffix')
          .optional()
          .setTitle('Position of the currency/unit symbol', 'Plassering av valuta-/enhetssymbol')
          .setDescription(
            'Display the unit as prefix or suffix. Default is prefix. (Use only when using currency or unit options)',
            'Viser enheten som prefiks eller suffiks. Standard er prefiks. Brukes bare sammen med valuta eller enhet.',
          ),
      ),

      // Older options based on react-number-format
      new CG.prop('number', new CG.union(CG.common('PatternFormatProps'), CG.common('NumberFormatProps')).optional()),
      new CG.prop('align', new CG.enum('right', 'center', 'left').optional({ default: 'left' })),
    )
      .addExample({
        currency: 'NOK',
      })
      .addExample({
        number: {
          thousandSeparator: ' ',
          decimalSeparator: ',',
          allowNegative: false,
          suffix: ' kr',
        },
      }),
  AnySummaryOverride: () =>
    // This is calculated as a union of all possible component-level overrides. Because it needs the full list of
    // components to generate, it is instead implemented in generateSummaryOverrides() below.
    new CG.raw({
      typeScript: 'BROKEN! Check that AnySummaryOverride is generated correctly',
      jsonSchema: 'BROKEN! Check that AnySummaryOverride is generated correctly' as JSONSchema7,
    }),
};

export type ValidCommonKeys = keyof typeof common;

interface TRB {
  title: LocalizedText;
  description: LocalizedText;
}

function makeTRB(keys: { [key: string]: TRB }) {
  const obj = new CG.obj();
  for (const prop in keys) {
    const val = keys[prop];
    obj.addProperty(
      new CG.trb({
        name: prop,
        title: val.title,
        description: val.description,
      }),
    );
  }
  return obj;
}

const implementationsCache: { [key: string]: MaybeSymbolizedCodeGenerator<unknown> } = {};
export function getSourceForCommon(
  key: ValidCommonKeys,
  from: 'TypeScript' | 'JsonSchema' = 'TypeScript',
  map?: { [key: string]: ComponentConfig },
) {
  const cacheKey = key === 'AnySummaryOverride' ? key + from : key;
  if (implementationsCache[cacheKey]) {
    return implementationsCache[cacheKey];
  }

  if (key === 'AnySummaryOverride') {
    if (map === undefined) {
      throw new Error('Full component map needed when generating AnySummaryOverride');
    }
    const impl = generateSummaryOverrides(from, map);
    impl.exportAs(key);
    implementationsCache[cacheKey] = impl;
    return impl;
  }

  const impl = common[key]();
  impl.exportAs(key);
  implementationsCache[cacheKey] = impl;
  return impl;
}

export function generateAllCommonTypes(map: { [key: string]: ComponentConfig }) {
  for (const key in common) {
    if (key === 'AnySummaryOverride') {
      getSourceForCommon(key, 'TypeScript', map);
      getSourceForCommon(key, 'JsonSchema', map);
      continue;
    }

    getSourceForCommon(key as ValidCommonKeys);
  }
}

export function generateCommonTypeScript() {
  for (const key in common) {
    const val = getSourceForCommon(key as ValidCommonKeys);

    // Calling toTypeScript() on an exported symbol will register it in the currently
    // generated file, so there's no need to output the result here
    val.toTypeScript();
  }
}

const serializedCommonTypeKeys = [
  'IDataModelBindingsSimple',
  'IDataModelBindingsOptionsSimple',
  'IDataModelBindingsLikert',
  'IDataModelBindingsList',
] as const satisfies readonly ValidCommonKeys[];

export function isSerializedCommonType(key: ValidCommonKeys): boolean {
  return serializedCommonTypeKeys.some((serializedKey) => serializedKey === key);
}

export function generateSerializedCommonTypeScript() {
  for (const key of serializedCommonTypeKeys) {
    getSourceForCommon(key).toTypeScript();
  }
}

export function generateCommonSchema() {
  for (const key in common) {
    const val = getSourceForCommon(key as ValidCommonKeys, 'JsonSchema');
    val.toJsonSchema();
  }
}

function generateSummaryOverrides(from: 'TypeScript' | 'JsonSchema', map: { [key: string]: ComponentConfig }) {
  const objects: MaybeOptionalCodeGenerator<unknown>[] = [];
  for (const componentKey in map) {
    const component = map[componentKey];
    const componentLevelOverrides =
      from === 'TypeScript' ? component.getSummaryOverridesImport('withRef') : component.getSummaryOverrides();

    if (componentLevelOverrides) {
      objects.push(componentLevelOverrides);
    }
  }

  return new CG.union(...objects);
}
