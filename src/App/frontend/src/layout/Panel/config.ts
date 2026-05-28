import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

// Mirrors PanelVariant in @app/form-component. Inlined so codegen (run via tsx)
// does not pull in the lib barrel, which transitively imports CSS modules.
const PANEL_VARIANTS = ['info', 'warning', 'error', 'success'] as const;

export const Config = new CG.component({
  category: CompCategory.Presentation,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: false,
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
      description: 'Header/title of the panel',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'body',
      title: 'Body',
      description: 'Body of the panel',
    }),
  )
  .addProperty(
    new CG.prop(
      'variant',
      new CG.enum(...PANEL_VARIANTS)
        .optional()
        .setTitle('Panel variant')
        .setDescription('Change the look of the panel')
        .exportAs('PanelVariant'),
    ),
  )
  .addProperty(
    new CG.prop(
      'showIcon',
      new CG.bool().optional({ default: true }).setTitle('Show icon').setDescription('Show icon in the panel header'),
    ),
  );
