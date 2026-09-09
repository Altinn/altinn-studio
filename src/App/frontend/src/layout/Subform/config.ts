import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Tabell for underskjema', en: 'Subform' },
    lifecycle: { status: 'stable' },
  },
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
      new CG.str()
        .setTitle('Layout set ID', 'ID for layout-sett')
        .setDescription(
          'The layout set to load for this subform',
          'Layout-settet som skal lastes inn i underskjemaet.',
        ),
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
              .setTitle('The column header value', 'Kolonneoverskrift')
              .setDescription(
                'The header value to display. May contain a text resource bindings, but no data model lookups.',
                'Kolonneoverskriften som skal vises. Kan inneholde en tekstressursbinding, men ikke oppslag i datamodellen.',
              ),
          ),
          new CG.prop(
            'cellContent',
            new CG.union(
              new CG.obj(
                new CG.prop(
                  'value',
                  new CG.expr(ExprVal.String)
                    .setTitle('The cell value', 'Celleverdi')
                    .setDescription(
                      'The cell value to display from an expression or static value',
                      'Celleverdien som skal vises fra et uttrykk eller en statisk verdi.',
                    ),
                ),
                new CG.prop(
                  'default',
                  new CG.str()
                    .optional()
                    .setTitle('The default cell value', 'Standard celleverdi')
                    .setDescription(
                      'The cell value to display if `query` or `value` returns no result.',
                      'Standardverdien som vises hvis query eller value ikke gir et resultat.',
                    ),
                ),
              ),
              new CG.obj(
                new CG.prop(
                  'query',
                  new CG.str()
                    .setTitle('The cell value via data model lookup', 'Celleverdi fra oppslag i datamodellen')
                    .setDescription(
                      'The cell value to display from a data model lookup (dot notation).',
                      'Celleverdien som skal vises fra et oppslag i datamodellen, angitt med punktnotasjon.',
                    )
                    .setDeprecated('Use "value" with a dataModel-expression instead'),
                ),
                new CG.prop(
                  'default',
                  new CG.str()
                    .optional()
                    .setTitle('The default cell value', 'Standard celleverdi')
                    .setDescription(
                      'The cell value to display if `query` or `value` returns no result.',
                      'Standardverdien som vises hvis query eller value ikke gir et resultat.',
                    ),
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
        .setTitle('The summary view cell delimiter', 'Skilletegn mellom celler i oppsummeringen')
        .setDescription(
          'The value used to separate cells/elements in a summary view where rich layout is not available. Typically a comma, dash or similar.',
          'Verdien som skiller celler eller elementer når oppsummeringen ikke kan bruke rik layout, vanligvis komma, bindestrek eller lignende.',
        )
        .optional({ default: ' — ' }),
    ),
  )
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'The title of the subform component', nb: 'Ledeteksten til underskjemakomponenten.' },
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
      title: 'Help text',
      description: 'Help text shown in a tooltip when clicking the help button',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'addButton',
      title: { en: 'Add button (suffix)', nb: 'Legg til-knapp (suffiks)' },
      description: {
        en: 'The text for the "Add" button (used as a suffix after the default button text)',
        nb: 'Teksten som legges til etter standardteksten på «Legg til»-knappen.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'tableEditButton',
      title: { en: 'Table edit button', nb: 'Redigeringsknapp i tabell' },
      description: {
        en: 'The text for the "Edit" button in the table rows',
        nb: 'Teksten på «Rediger»-knappen i tabellradene.',
      },
    }),
  )
  .addSummaryOverrides((obj) => {
    obj.addProperty(
      new CG.prop(
        'display',
        new CG.enum('table', 'full')
          .optional({ default: 'table' })
          .setTitle('Display type', 'Visningstype')
          .setDescription(
            'Show the summary as a table or as full summary components',
            'Viser oppsummeringen som en tabell eller som fullstendige oppsummeringskomponenter.',
          ),
      ),
    );
  });
