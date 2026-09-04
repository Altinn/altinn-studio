import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { asOptionsComponent } from 'src/features/options/config';

export const Config = asOptionsComponent(
  new CG.component({
    category: CompCategory.Container,
    availability: 'configurable',
    metadata: {
      name: { nb: 'Likert-skala', en: 'Likert' },
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
      customExpressions: true,
      displayData: false,
    },
  }),
  { supportsPreselection: false },
)
  // Auto-generated LikertItem inside here is a form component, so this is a little bit of both a
  // container and a form component
  .extends(CG.common('FormComponentProps'))
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'The title of the group', nb: 'Ledeteksten til gruppen.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: { en: 'Description', nb: 'Beskrivelse' },
      description: { en: 'The description text for the Likert table.', nb: 'Beskrivelsen av Likert-tabellen.' },
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
  .addTextResource(
    new CG.trb({
      name: 'leftColumnHeader',
      title: { en: 'Left column header', nb: 'Overskrift for venstre kolonne' },
      description: {
        en: 'The header text for the left column in the Likert table',
        nb: 'Overskriften for venstre kolonne i Likert-tabellen.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'questions',
      title: { en: 'Questions', nb: 'Spørsmål' },
      description: {
        en: 'The questions to be displayed in each row (use a dynamic text resource)',
        nb: 'Spørsmålene som vises i hver rad. Bruk en dynamisk tekstressurs.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'questionDescriptions',
      title: { en: 'Question descriptions', nb: 'Spørsmålsbeskrivelser' },
      description: {
        en: 'The descriptions to be displayed in each row (use a dynamic text resource)',
        nb: 'Beskrivelsene som vises i hver rad. Bruk en dynamisk tekstressurs.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'questionHelpTexts',
      title: { en: 'Question help texts', nb: 'Hjelpetekster for spørsmål' },
      description: {
        en: 'The help texts to be displayed in each row (use a dynamic text resource)',
        nb: 'Hjelpetekstene som vises i hver rad. Bruk en dynamisk tekstressurs.',
      },
    }),
  )
  .addDataModelBinding(CG.common('IDataModelBindingsLikert'))
  .addProperty(
    new CG.prop(
      'filter',
      new CG.arr(
        new CG.obj(
          new CG.prop('key', new CG.enum('start', 'stop')),
          new CG.prop('value', new CG.union(new CG.str().setPattern(/^\d+$/), new CG.num())),
        ),
      )
        .optional()
        .setTitle('Filter', 'Filter')
        .setDescription(
          'Optionally filter specific rows within the likert group using start/stop indexes for displaying the desired ones' +
            '(beware that start index starts at zero, and stop index starts at one, so {start, stop} = {0, 3} will display 3 rows, not 4)',
          'Filtrerer radene i Likert-gruppen med start- og stoppindekser.',
        )
        .exportAs('ILikertFilter'),
    ),
  )
  .addSummaryOverrides()
  .extends(CG.common('ILikertColumnProperties'));
