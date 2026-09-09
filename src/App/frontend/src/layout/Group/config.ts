import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Container,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Gruppe', en: 'Group' },
    lifecycle: { status: 'stable' },
  },
  directRendering: true,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
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
      description: { en: 'The title of the group (shown above the group)', nb: 'Ledeteksten som vises over gruppen.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: { en: 'Description', nb: 'Beskrivelse' },
      description: {
        en: 'The description text shown underneath the title',
        nb: 'Beskrivelsen som vises under ledeteksten.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: { en: 'Help text', nb: 'Hjelpetekst' },
      description: {
        en: 'Help text shown in a tooltip when clicking the help button',
        nb: 'Hjelpetekst som vises når brukeren klikker på hjelpeknappen.',
      },
    }),
  )
  .addProperty(
    new CG.prop(
      'groupingIndicator',
      new CG.enum('indented', 'panel')
        .optional()
        .setTitle('Set grouping indicator', 'Vis grupperingsmarkør')
        .setDescription(
          'Can visually group components together by indenting them or by putting them in a panel. ',
          'Grupperer komponenter visuelt med innrykk eller et panel.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'children',
      new CG.arr(new CG.str())
        .setTitle('Children', 'Underkomponenter')
        .setDescription(
          'Array of component IDs that should be displayed in the group',
          'Liste over komponent-ID-er som skal vises i gruppen.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'headingLevel',
      new CG.enum(2, 3, 4, 5, 6)
        .optional()
        .setTitle('Heading level', 'Overskriftsnivå')
        .setDescription('The heading level of the group title.', 'Overskriftsnivået for gruppetittelen.'),
    ),
  )
  .addSummaryOverrides();
