import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Container,
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
          new CG.prop('title', new CG.str().setTitle('Title').setDescription('Title of the tab')),
          new CG.prop('icon', new CG.str().optional().addExample('https://example.com/icon.svg')),
          new CG.prop(
            'children',
            new CG.arr(new CG.str())
              .setTitle('Children')
              .setDescription('List of component IDs that should be displayed in the Tab'),
          ),
        ).exportAs('TabConfig'),
      ),
    ),
  )
  .addSummaryOverrides();
