import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Action,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Egendefinert knapp', en: 'CustomButton' },
    lifecycle: { status: 'stable' },
  },
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
      )
        .setTitle('Actions', 'Handlinger')
        .setDescription(
          'Actions to run when the user selects the button.',
          'Handlingene som kjøres når brukeren velger knappen.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'buttonStyle',
      new CG.enum('primary', 'secondary', 'tertiary')
        .setTitle('Button style', 'Knappestil')
        .setDescription('The style/color scheme of the button.', 'Knappens stil eller fargepalett.')
        .optional({ default: 'secondary' })
        .exportAs('ButtonStyle'),
    ),
  )
  .addProperty(
    new CG.prop(
      'buttonColor',
      new CG.enum('first', 'second', 'success', 'danger')
        .setTitle('Button color override', 'Overstyr knappens farge')
        .setDescription('The color scheme of the button.', 'Knappens fargepalett.')
        .optional({ default: undefined })
        .exportAs('ButtonColor'),
    ),
  )
  .addProperty(
    new CG.prop(
      'buttonSize',
      new CG.enum('sm', 'md', 'lg', 'small', 'medium', 'large')
        .setTitle('Button size override', 'Overstyr knappens størrelse')
        .setDescription('The size of the button.', 'Knappens størrelse.')
        .optional({ default: undefined })
        .exportAs('CustomButtonSize'),
    ),
  )
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'The title/text on the button', nb: 'Teksten på knappen.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'tableTitle',
      title: { en: 'Table title', nb: 'Tabelltittel' },
      description: {
        en: 'The title/text for the button when rendered in a table',
        nb: 'Knappeteksten når knappen vises i en tabell.',
      },
    }),
  );
