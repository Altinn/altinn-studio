import { PANEL_VARIANT } from 'src/app-components/Panel/constants';
import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

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
      new CG.enum(...Object.values(PANEL_VARIANT))
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
