import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Container,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Tabs', en: 'Tabs' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInTabs: false,
    renderInCards: false,
    renderInCardsMedia: false,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addProperty(new CG.prop('size', new CG.enum('small', 'medium', 'large').optional({ default: 'medium' })))
  .addProperty(new CG.prop('defaultTab', new CG.str().optional()))
  .addProperty(
    new CG.prop(
      'tabs',
      new CG.arr(
        new CG.obj(
          new CG.prop('id', new CG.str()),
          new CG.prop(
            'title',
            new CG.str().setTitle('Title', 'Ledetekst').setDescription('Title of the tab', 'Fanens tittel.'),
          ),
          new CG.prop('icon', new CG.str().optional().addExample('https://example.com/icon.svg')),
          new CG.prop(
            'children',
            new CG.arr(new CG.str())
              .setTitle('Children', 'Underkomponenter')
              .setDescription(
                'List of component IDs that should be displayed in the Tab',
                'Liste over komponent-ID-er som skal vises i fanen.',
              ),
          ),
        ).exportAs('TabConfig'),
      ),
    ),
  )
  .addSummaryOverrides();
