import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';

export const Config = new CG.component({
  category: CompCategory.Container,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Trekkspilliste', en: 'Accordion' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: true,
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
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'The title of the accordion', nb: 'Ledeteksten til trekkspillelementet.' },
    }),
  )
  .addProperty(
    new CG.prop(
      'children',
      new CG.arr(new CG.str())
        .setTitle('Children', 'Underkomponenter')
        .setDescription(
          'List of child component IDs to show inside the Accordion (limited to a few component types)',
          'Liste over ID-ene til underkomponentene som skal vises i trekkspillelementet. Bare enkelte komponenttyper støttes.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'openByDefault',
      new CG.expr(ExprVal.Boolean)
        .optional({ default: false })
        .setTitle('Open by default', 'Åpen som standard')
        .setDescription(
          'Boolean value indicating if the accordion should be open by default',
          'Angir om trekkspillelementet skal være åpent som standard.',
        ),
    ),
  )
  .addProperty(new CG.prop('headingLevel', CG.common('HeadingLevel').optional()));
