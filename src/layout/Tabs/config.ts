import { CG, Variant } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Container,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInTabs: false,
    renderInCards: false,
    renderInCardsMedia: false,
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
        ).exportAs('TabConfigExternal'),
      ),
    ).onlyIn(Variant.External),
  )
  .addProperty(
    new CG.prop(
      'tabsInternal',
      new CG.arr(
        new CG.obj(
          new CG.prop('id', new CG.str()),
          new CG.prop('title', new CG.str()),
          new CG.prop('icon', new CG.str().optional()),
          new CG.prop(
            'childNodes',
            new CG.arr(CG.layoutNode)
              .setTitle('Children')
              .setDescription('List of component IDs that should be displayed in the Tab'),
          ),
        ).exportAs('TabConfigInternal'),
      ),
    ).onlyIn(Variant.Internal),
  );
