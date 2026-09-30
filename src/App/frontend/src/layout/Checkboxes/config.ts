import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { asOptionsComponent } from 'src/features/options/config';

export const Config = asOptionsComponent(
  new CG.component({
    category: CompCategory.Form,
    availability: 'configurable',
    metadata: {
      name: { nb: 'Avmerkingsbokser', en: 'Checkboxes' },
      lifecycle: { status: 'stable' },
    },
    capabilities: {
      renderInTable: true,
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
  }),
  { supportsPreselection: true },
)
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'group',
        new CG.dataModelBinding()
          .setTitle('group', 'gruppe')
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
      .exportAs('IDataModelBindingsForGroupCheckbox')
      .extends(CG.common('IDataModelBindingsOptionsSimple')),
  )
  .addProperty(new CG.prop('deletionStrategy', new CG.enum('soft', 'hard').optional()))
  .addProperty(new CG.prop('layout', CG.common('LayoutStyle').optional()))
  .addProperty(
    new CG.prop(
      'showLabelsInTable',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Show label when single option in table', 'Vis ledetekst ved ett alternativ i tabellen')
        .setDescription(
          'Boolean value indicating if the label should be visible when only one option exists in table',
          'Angir om ledeteksten skal vises når tabellen bare har ett alternativ.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'alertOnChange',
      new CG.expr(ExprVal.Boolean)
        .optional({ default: false })
        .setTitle('Alert on change', 'Varsel ved endring')
        .setDescription(
          'Boolean value indicating if the component should alert on change',
          'Angir om komponenten skal varsle ved endringer.',
        ),
    ),
  )
  .addSummaryOverrides((obj) => {
    obj.addProperty(
      new CG.prop(
        'displayType',
        new CG.enum('list', 'string')
          .optional()
          .setTitle('Display type', 'Visningstype')
          .setDescription(
            'How data should be displayed for this checkboxes component in the summary',
            'Angir hvordan data fra Checkboxes-komponenten skal vises i oppsummeringen.',
          ),
      ),
    );
  })
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
