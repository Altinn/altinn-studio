import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Action,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Navigasjonsknapper', en: 'NavigationButtons' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: true,
    renderInAccordion: false,
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
      name: 'back',
      title: { en: 'Back', nb: 'Tilbake' },
      description: {
        en: 'Text on the back/previous page button',
        nb: 'Teksten på knappen for å gå tilbake til forrige side.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'next',
      title: { en: 'Next', nb: 'Neste' },
      description: { en: 'Text on the next page button', nb: 'Teksten på knappen for å gå til neste side.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'backToPage',
      title: { en: 'Back to Page', nb: 'Tilbake til side' },
      description: {
        en: 'Text on the "Back to Page" button when linkToPage/linkToComponent expression is used.',
        nb: 'Teksten på knappen «Tilbake til side» når uttrykket linkToPage eller linkToComponent brukes.',
      },
    }),
  )
  .addProperty(
    new CG.prop(
      'showBackButton',
      new CG.bool()
        .optional({ default: true })
        .setTitle('Show back button', 'Vis tilbakeknappen')
        .setDescription(
          "Shows two buttons (back/next) instead of just 'next'.",
          'Viser både tilbake- og neste-knapp i stedet for bare neste-knappen.',
        ),
    ),
  )
  .addProperty(new CG.prop('validateOnNext', CG.common('PageValidation').optional()))
  .addProperty(new CG.prop('validateOnPrevious', CG.common('PageValidation').optional()));
