import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';

export const Config = new CG.component({
  category: CompCategory.Container,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Repeterende gruppe', en: 'RepeatingGroup' },
    lifecycle: { status: 'stable' },
  },
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
  .addProperty(new CG.prop('rowsBefore', CG.common('GridRows').optional()))
  .addProperty(new CG.prop('rowsAfter', CG.common('GridRows').optional()))
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: {
        en: 'The title of the group (shown above each instance in a Summary)',
        nb: 'Ledeteksten til gruppen, vist over hver forekomst i en oppsummering.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: { en: 'Description', nb: 'Beskrivelse' },
      description: {
        en: 'The description text shown underneath the title',
        nb: 'Beskrivelsen som vises under ledeteksten.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: { en: 'Help text', nb: 'Hjelpetekst' },
      description: {
        en: 'Help text shown in a tooltip when clicking the help button',
        nb: 'Hjelpetekst som vises når brukeren klikker på hjelpeknappen.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'addButtonFull',
      title: {
        en: 'Add button (full) (for repeating groups)',
        nb: 'Legg til-knapp (full tekst, for repeterende grupper)',
      },
      description: {
        en: 'The text for the "Add" button (overrides "addButton", and sets the full text for the button)',
        nb: 'Teksten på «Legg til»-knappen. Overstyrer «addButton» og angir hele knappeteksten.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'addButton',
      title: {
        en: 'Add button (suffix) (for repeating groups)',
        nb: 'Legg til-knapp (suffiks, for repeterende grupper)',
      },
      description: {
        en: 'The text for the "Add" button (used as a suffix after the default button text)',
        nb: 'Teksten som legges til etter standardteksten på «Legg til»-knappen.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'saveButton',
      title: { en: 'Save button (for repeating groups)', nb: 'Lagre-knapp (for repeterende grupper)' },
      description: {
        en: 'The text for the "Save" button when the repeating group item is in edit mode',
        nb: 'Teksten på «Lagre»-knappen når raden i den repeterende gruppen redigeres.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'saveAndNextButton',
      title: {
        en: 'Save and next button (for repeating groups)',
        nb: 'Lagre og neste-knapp (for repeterende grupper)',
      },
      description: {
        en:
          'The text for the "Save and next" button when the repeating group item is in edit mode ' +
          '(only displayed if edit.saveAndNextButton is true)',
        nb: 'Teksten på «Lagre og neste»-knappen når raden redigeres. Vises bare når edit.saveAndNextButton er true.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'editButtonClose',
      title: {
        en: 'Edit button (close) (for repeating groups)',
        nb: 'Redigeringsknapp (lukk, for repeterende grupper)',
      },
      description: {
        en:
          'The text for the "Edit" button when the repeating group item is in ' +
          'edit mode (i.e. the user can close the edit mode)',
        nb: 'Teksten på «Rediger»-knappen når raden redigeres og brukeren kan lukke redigeringsvisningen.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'editButtonOpen',
      title: {
        en: 'Edit button (open) (for repeating groups)',
        nb: 'Redigeringsknapp (åpne, for repeterende grupper)',
      },
      description: {
        en: 'The text for the "Edit" button when the repeating group item is not in edit mode (i.e. the user can open the edit mode)',
        nb: 'Teksten på «Rediger»-knappen når raden i den repeterende gruppen ikke redigeres.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'paginationNextButton',
      title: { en: 'Next button in pagination', nb: 'Neste-knapp i paginering' },
      description: {
        en: 'The text for the "Next" button in pagination',
        nb: 'Teksten på «Neste»-knappen i paginering.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'paginationBackButton',
      title: { en: 'Back button in pagination', nb: 'Tilbakeknapp i paginering' },
      description: {
        en: 'The text for the "Back" button in pagination',
        nb: 'Teksten på «Tilbake»-knappen i paginering.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'multipageBackButton',
      title: { en: 'Back button in multipage navigation', nb: 'Tilbakeknapp i flersidenavigasjon' },
      description: {
        en: 'The text for the "Back" button in multipage navigation',
        nb: 'Teksten på «Tilbake»-knappen i flersidenavigasjon.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'multipageNextButton',
      title: { en: 'Next button in multipage navigation', nb: 'Neste-knapp i flersidenavigasjon' },
      description: {
        en: 'The text for the "Next" button in multipage navigation',
        nb: 'Teksten på «Neste»-knappen i flersidenavigasjon.',
      },
    }),
  )
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'group',
        new CG.dataModelBinding()
          .setTitle('Group', 'Gruppe')
          .setDescription(
            'Dot notation location for a repeating group structure (array of objects), where the data is stored',
            'Plassering i punktnotasjon for den repeterende gruppestrukturen, en liste med objekter, der dataene lagres.',
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
            .setTitle('Mode', 'Modus')
            .setDescription('The mode of the repeating group', 'Modusen til den repeterende gruppen.'),
        ),
        new CG.prop(
          'addButton',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: true })
            .setTitle('Add button', 'Legg til-knapp')
            .setDescription(
              'Expression or boolean indicating whether to show the "Add" button',
              'Uttrykk eller boolsk verdi som angir om «Legg til»-knappen skal vises.',
            ),
        ),
        new CG.prop(
          'saveButton',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: true })
            .setTitle('Save button', 'Lagre-knapp')
            .setDescription(
              'Expression or boolean indicating whether to show the "Save" button',
              'Uttrykk eller boolsk verdi som angir om «Lagre»-knappen skal vises.',
            ),
        ),
        new CG.prop(
          'deleteButton',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: true })
            .setTitle('Delete button', 'Slett-knapp')
            .setDescription(
              'Expression or boolean indicating whether to show the "Delete" button',
              'Uttrykk eller boolsk verdi som angir om «Slett»-knappen skal vises.',
            ),
        ),
        new CG.prop(
          'editButton',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: true })
            .setTitle('Edit button', 'Redigeringsknapp')
            .setDescription(
              'Expression or boolean indicating whether to show the "Edit" button',
              'Uttrykk eller boolsk verdi som angir om «Rediger»-knappen skal vises.',
            ),
        ),
        new CG.prop(
          'multiPage',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Multi page functionality', 'Flersidefunksjonalitet')
            .setDescription(
              'Turning this on makes it possible to display the edit mode for a repeating group with multiple ' +
                'inner pages. Every component referenced in the "children" property should have a prefix with the ' +
                'page number it should be displayed on (e.g. "1:component1", "2:component2", etc.)',
              'Gjør det mulig å redigere en repeterende gruppe over flere interne sider.',
            ),
        ),
        new CG.prop(
          'openByDefault',
          new CG.union(new CG.bool(), new CG.const('first'), new CG.const('last'))
            .optional({ default: false })
            .setTitle('Open by default', 'Åpen som standard')
            .setDescription(
              'If set to true, a row of the repeating group will be opened by default, if the group has no ' +
                'rows already. If set to "first" or "last", the first or last row will be opened by default',
              'Åpner en rad som standard når gruppen er tom.',
            ),
        ),
        new CG.prop(
          'alertOnDelete',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: false })
            .setTitle('Alert on delete', 'Varsel ved sletting')
            .setDescription(
              'Expression or boolean indicating whether to show an alert when the user ' +
                'clicks the "Delete" button, prompting them to confirm the deletion',
              'Uttrykk eller boolsk verdi som angir om brukeren skal bekrefte sletting.',
            ),
        ),
        new CG.prop(
          'saveAndNextButton',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: false })
            .setTitle('Save and next button', 'Lagre og neste-knapp')
            .setDescription(
              'Expression or boolean indicating whether to show the "Save and next" button when editing ' +
                'a repeating group row. This button will save the current row and open the next row for editing.',
              'Uttrykk eller boolsk verdi som angir om «Lagre og neste»-knappen skal vises.',
            ),
        ),
        new CG.prop(
          'alwaysShowAddButton',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Always show add button', 'Vis alltid Legg til-knappen')
            .setDescription(
              'If set to true, the "Add" button will always be shown, even if the user is ' +
                'currently editing another row',
              'Viser alltid «Legg til»-knappen, også under redigering.',
            ),
        ),
        new CG.prop(
          'compactButtons',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Compact buttons', 'Kompakte knapper')
            .setDescription(
              'If true, edit and delete buttons in the table only show icons when the row is not in edit mode. ' +
                'Text will still be shown when the row is in edit mode.',
              'Viser bare ikoner på redigerings- og sletteknappene når raden ikke redigeres.',
            ),
        ),
        new CG.prop(
          'buttonLayout',
          new CG.enum('horizontal', 'vertical')
            .optional({ default: 'horizontal' })
            .setTitle('Button layout', 'Knappelayout')
            .setDescription(
              'In desktop table view, controls how the edit and delete buttons are laid out. ' +
                '"horizontal" uses two table columns (edit and delete side by side). ' +
                '"vertical" uses a single button column with edit above delete, saving horizontal space. ' +
                'Does not apply to mobile/tablet layout. ' +
                'Can be combined with compactButtons.',
              'Angir plasseringen av redigerings- og sletteknappene i tabellvisning på store skjermer.',
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
        .setTitle('Pagination options', 'Pagineringsinnstillinger')
        .setDescription(
          'Pagination options for the repeating group rows.',
          'Innstillinger for paginering av radene i den repeterende gruppen.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'maxCount',
      new CG.int()
        .optional()
        .setMin(1)
        .setTitle('Max number of rows', 'Maksimalt antall rader')
        .setDescription('Maximum number of rows that can be added.', 'Maksimalt antall rader brukeren kan legge til.'),
    ),
  )
  .addProperty(
    new CG.prop(
      'minCount',
      new CG.int()
        .setMin(0)
        .optional({ default: 0 })
        .setTitle('Min number of rows', 'Minste antall rader')
        .setDescription(
          'Minimum number of rows that should be added. If the user has not added enough rows, ' +
            'the repeating group will show a validation error',
          'Minste antall rader brukeren må legge til. Gruppen viser en valideringsfeil hvis den har for få rader.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'tableHeaders',
      new CG.arr(new CG.str())
        .optional()
        .setTitle('Table headers', 'Tabelloverskrifter')
        .setDescription(
          'Array of component IDs that should be displayed as table headers. If not defined, all components ' +
            'referenced in the "children" property will be displayed as table headers',
          'Liste over komponent-ID-er som skal vises som tabelloverskrifter.',
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
                .setTitle('Edit in table', 'Rediger i tabell')
                .setDescription(
                  'If set to true, the component will be editable directly in the table view. ',
                  'Gjør komponenten redigerbar direkte i tabellvisningen.',
                ),
            ),
            new CG.prop(
              'showInExpandedEdit',
              new CG.bool()
                .optional({ default: true })
                .setTitle('Show in expanded edit', 'Vis i utvidet redigering')
                .setDescription(
                  'If set to true, the component will be shown in the expanded edit view. This is also the default ' +
                    'behavior, but can be turned off for components that are only to be edited in the table view.',
                  'Viser komponenten i den utvidede redigeringsvisningen.',
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
        .setTitle('Hidden row?', 'Skjult rad')
        .setDescription(
          'Expression or boolean indicating whether each row should be hidden. An expression will be evaluated per ' +
            'row, and if it evaluates to true, the row will be hidden. If set to true, all rows will be hidden.',
          'Uttrykk eller boolsk verdi som angir om hver rad skal skjules.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'stickyHeader',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Sticky header', 'Fast overskrift')
        .setDescription(
          'If set to true, the header of the repeating group will be sticky',
          'Fester overskriften til den repeterende gruppen mens brukeren ruller.',
        ),
    ),
  )
  .addProperty(new CG.prop('labelSettings', CG.common('ILabelSettings').optional()))
  .addProperty(new CG.prop('addButton', new CG.obj().extends(CG.common('IButtonProps')).optional()))
  .addProperty(
    new CG.prop(
      'children',
      new CG.arr(new CG.str())
        .setTitle('Children', 'Underkomponenter')
        .setDescription(
          'List of child component IDs to show inside (will be repeated according to the number of rows in the data model binding)',
          'Liste over ID-ene til underkomponentene som skal vises. Komponentene gjentas for hver rad i datamodellbindingen.',
        ),
    ),
  )
  .addSummaryOverrides((obj) => {
    obj.addProperty(
      new CG.prop(
        'display',
        new CG.enum('table', 'full')
          .optional({ default: 'full' })
          .setTitle('Display type', 'Visningstype')
          .setDescription(
            'Show the summary as a table or as full summary components',
            'Viser oppsummeringen som en tabell eller som fullstendige oppsummeringskomponenter.',
          ),
      ),
    );
  });
