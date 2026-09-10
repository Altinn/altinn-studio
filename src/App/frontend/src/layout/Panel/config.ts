import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

// Mirrors PanelVariant in @app/form-component. Inlined so codegen (run via tsx)
// does not pull in the lib barrel, which transitively imports CSS modules.
const PANEL_VARIANTS = ['info', 'warning', 'error', 'success'] as const;

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Informativ melding', en: 'Panel' },
    lifecycle: { status: 'stable' },
  },
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
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'Header/title of the panel', nb: 'Overskriften eller tittelen i panelet.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'body',
      title: { en: 'Body', nb: 'Brødtekst' },
      description: { en: 'Body of the panel', nb: 'Brødteksten i panelet.' },
    }),
  )
  .addProperty(
    new CG.prop(
      'variant',
      new CG.enum(...PANEL_VARIANTS)
        .optional()
        .setTitle('Panel variant', 'Panelvariant')
        .setDescription('Change the look of the panel', 'Endrer utseendet på panelet.')
        .exportAs('PanelVariant'),
    ),
  )
  .addProperty(
    new CG.prop(
      'showIcon',
      new CG.bool()
        .optional({ default: true })
        .setTitle('Show icon', 'Vis ikon')
        .setDescription('Show icon in the panel header', 'Viser et ikon i paneloverskriften.'),
    ),
  );
