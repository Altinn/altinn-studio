import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Action,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
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
  .addProperty(
    new CG.prop(
      'actions',
      new CG.arr(
        new CG.union(
          new CG.union(
            new CG.obj(
              new CG.prop('id', new CG.const('nextPage')),
              new CG.prop('type', new CG.const('ClientAction')),
              new CG.prop('validation', CG.common('PageValidation').optional()),
            ).exportAs('NextPageAction'),
            new CG.obj(
              new CG.prop('id', new CG.const('previousPage')),
              new CG.prop('type', new CG.const('ClientAction')),
              new CG.prop('validation', CG.common('PageValidation').optional()),
            ).exportAs('PreviousPageAction'),
            new CG.obj(
              new CG.prop('id', new CG.const('navigateToPage')),
              new CG.prop('type', new CG.const('ClientAction')),
              new CG.prop('validation', CG.common('PageValidation').optional()),
              new CG.prop('metadata', new CG.obj(new CG.prop('page', new CG.str()))),
            ).exportAs('NavigateToPageAction'),
            new CG.union(
              new CG.obj(
                new CG.prop('id', new CG.const('closeSubform')),
                new CG.prop('type', new CG.const('ClientAction')),
                new CG.prop('validation', CG.common('PageValidation').optional()),
              ).exportAs('CloseSubformAction'),
            ).exportAs('SubformAction'),
          ).exportAs('ClientAction'),
          new CG.obj(
            new CG.prop('id', new CG.str()),
            new CG.prop('type', new CG.const('ServerAction')),
            new CG.prop('validation', CG.common('PageValidation').optional()),
          ).exportAs('ServerAction'),
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
        .optional({ default: 'secondary' })
        .exportAs('ButtonStyle'),
    ),
  )
  .addProperty(
    new CG.prop(
      'buttonColor',
      new CG.enum('first', 'second', 'success', 'danger')
        .setTitle('Button color override')
        .setDescription('The color scheme of the button.')
        .optional({ default: undefined })
        .exportAs('ButtonColor'),
    ),
  )
  .addProperty(
    new CG.prop(
      'buttonSize',
      new CG.enum('sm', 'md', 'lg', 'small', 'medium', 'large')
        .setTitle('Button size override')
        .setDescription('The size of the button.')
        .optional({ default: undefined })
        .exportAs('CustomButtonSize'),
    ),
  )
  .addTextResource(new CG.trb({ name: 'title', title: 'Title', description: 'The title/text on the button' }));
