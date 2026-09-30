import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Action,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Forhåndsvis PDF', en: 'Preview PDF' },
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
      title: { en: 'Button title/text', nb: 'Knappetekst' },
      description: { en: 'The text to display on the button.', nb: 'Teksten som vises på knappen.' },
    }),
  )
  .addProperty(
    new CG.prop(
      'buttonStyle',
      new CG.enum('primary', 'secondary')
        .setTitle('Button style', 'Knappestil')
        .setDescription('The style/color scheme of the button.', 'Knappens stil eller fargepalett.')
        .exportAs('ActionButtonStyle'),
    ),
  );
