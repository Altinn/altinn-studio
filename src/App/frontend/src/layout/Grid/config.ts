import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Container,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Rutenett', en: 'Grid' },
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
    customExpressions: false,
  },
})
  .addSummaryOverrides((obj) => {
    obj.addProperty(
      new CG.prop(
        'hideEmptyRows',
        new CG.bool()
          .optional()
          .setTitle('Hide empty rows', 'Skjul tomme rader')
          .setDescription(
            'Whether to hide empty rows in the Grid. Rows are considered empty only when they contain components, and all those components are hidden or empty.',
            'Angir om tomme rader i Grid skal skjules. En rad regnes bare som tom når den inneholder komponenter og alle er skjult eller tomme.',
          ),
      ),
    );
  })
  .addProperty(new CG.prop('rows', CG.common('GridRows')))
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
