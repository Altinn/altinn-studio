import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { asOptionsComponent } from 'src/features/options/config';

export const Config = asOptionsComponent(
  new CG.component({
    category: CompCategory.Form,
    availability: 'configurable',
    metadata: {
      name: { nb: 'Nedtrekksliste med flere valg', en: 'MultipleSelect' },
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
            'How data should be displayed for the this multiple select component in the summary',
            'Angir hvordan data fra MultipleSelect-komponenten skal vises i oppsummeringen.',
          ),
      ),
    );
  })
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
      .exportAs('IDataModelBindingsForGroupMultiselect')
      .extends(CG.common('IDataModelBindingsOptionsSimple')),
  )
  .addProperty(new CG.prop('deletionStrategy', new CG.enum('soft', 'hard').optional()))
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
