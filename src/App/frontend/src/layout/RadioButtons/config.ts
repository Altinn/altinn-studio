import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';
import { asOptionsComponent } from 'src/features/options/config';

export const Config = asOptionsComponent(
  new CG.component({
    category: CompCategory.Form,
    availability: 'configurable',
    metadata: {
      name: { nb: 'Radioknapper', en: 'RadioButtons' },
      lifecycle: { status: 'stable' },
    },
    capabilities: {
      renderInTable: true,
      renderInButtonGroup: false,
      renderInAccordion: true,
      renderInAccordionGroup: false,
      renderInTabs: true,
      renderInCards: true,
      renderInCardsMedia: false,
    },
    functionality: {
      customExpressions: true,
    },
  }),
  { supportsPreselection: true },
)
  .addDataModelBinding(CG.common('IDataModelBindingsOptionsSimple'))
  .addProperty(new CG.prop('layout', CG.common('LayoutStyle').optional()))
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
      'showAsCard',
      new CG.bool()
        .optional()
        .setTitle('Show as card', 'Vis som kort')
        .setDescription(
          'Boolean value indicating if the options should be displayed as cards. Defaults to false.',
          'Angir om alternativene skal vises som kort.',
        ),
    ),
  )
  .addSummaryOverrides()
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
