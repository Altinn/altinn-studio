import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Action,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Send inn', en: 'Button' },
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
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'The title/text on the button', nb: 'Teksten på knappen.' },
    }),
  )
  .addProperty(
    new CG.prop(
      'mode',
      new CG.enum('submit', 'save', 'instantiate')
        .optional({ default: 'submit' })
        .setTitle('Mode', 'Modus')
        .setDescription('The mode of the button', 'Knappens modus.')
        .exportAs('ButtonMode'),
    ),
  )
  .extends(CG.common('IButtonProps'))
  .addProperty(new CG.prop('mapping', CG.common('IMapping').optional()));
