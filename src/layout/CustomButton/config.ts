import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Action,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
  },
})
  .addProperty(
    new CG.prop(
      'actions',
      new CG.arr(
        new CG.union(
          new CG.union(
            new CG.obj(
              new CG.prop('id', new CG.const('nextPage')),
              new CG.prop('type', new CG.const('ClientAction')),
            ).exportAs('NextPageAction'),
            new CG.obj(
              new CG.prop('id', new CG.const('previousPage')),
              new CG.prop('type', new CG.const('ClientAction')),
            ).exportAs('PreviousPageAction'),
            new CG.obj(
              new CG.prop('id', new CG.const('navigateToPage')),
              new CG.prop('type', new CG.const('ClientAction')),
              new CG.prop('metadata', new CG.obj(new CG.prop('page', new CG.str()))),
            ).exportAs('NavigateToPageAction'),
          ).exportAs('ClientAction'),
          new CG.obj(new CG.prop('id', new CG.str()), new CG.prop('type', new CG.const('ServerAction'))).exportAs(
            'ServerAction',
          ),
        ).exportAs('CustomAction'),
      ),
    ),
  )
  .addProperty(
    new CG.prop(
      'buttonStyle',
      new CG.enum('primary', 'secondary')
        .setTitle('Button style')
        .setDescription('The style/color scheme of the button.')
        .exportAs('CustomButtonStyle'),
    ),
  )
  .addTextResource(new CG.trb({ name: 'title', title: 'Title', description: 'The title/text on the button' }));
