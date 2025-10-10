import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Presentation,
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
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'The title of the alert',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'body',
      title: 'Body',
      description: 'The body text of the alert',
    }),
  )
  .addProperty(
    new CG.prop(
      'severity',
      new CG.enum('success', 'warning', 'danger', 'info')
        .setTitle('Alert severity')
        .setDescription('The severity of the alert')
        .exportAs('AlertSeverity'),
    ),
  );
