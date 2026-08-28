import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Finn person', en: 'PersonLookup' },
    lifecycle: { status: 'stable' },
  },
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
  .addSummaryOverrides()
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'ssn',
        new CG.dataModelBinding()
          .setTitle('Data model binding for social security number', 'Datamodellbinding for fødselsnummer')
          .setDescription(
            'Describes the location in the data model where the component should store the ssn of the person to look up.',
            'Angir hvor i datamodellen komponenten skal lagre fødselsnummeret til personen som slås opp.',
          ),
      ),
      new CG.prop(
        'fullName',
        new CG.dataModelBinding()
          .optional()
          .setTitle('Data model binding for the full name of a person', 'Datamodellbinding for fullt navn')
          .setDescription(
            'Describes the location in the data model where the component should store the name of the person to look up.',
            'Angir hvor i datamodellen komponenten skal lagre navnet på personen som slås opp.',
          ),
      ),
      new CG.prop(
        'lastName',
        new CG.dataModelBinding()
          .optional()
          .setTitle('Data model binding for the last name of a person', 'Datamodellbinding for etternavn')
          .setDescription(
            'Describes the location in the data model where the component should store the last name of the person to look up.',
            'Angir hvor i datamodellen komponenten skal lagre etternavnet til personen som slås opp.',
          ),
      ),
      new CG.prop(
        'middleName',
        new CG.dataModelBinding()
          .optional()
          .setTitle('Data model binding for the middle name of a person', 'Datamodellbinding for mellomnavn')
          .setDescription(
            'Describes the location in the data model where the component should store the middle name of the person to look up.',
            'Angir hvor i datamodellen komponenten skal lagre mellomnavnet til personen som slås opp.',
          ),
      ),
      new CG.prop(
        'firstName',
        new CG.dataModelBinding()
          .optional()
          .setTitle('Data model binding for the first name of a person', 'Datamodellbinding for fornavn')
          .setDescription(
            'Describes the location in the data model where the component should store the first name of the person to look up.',
            'Angir hvor i datamodellen komponenten skal lagre fornavnet til personen som slås opp.',
          ),
      ),
    ).exportAs('IDataModelBindingsForPersonLookup'),
  )
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'The title of the component', nb: 'Ledeteksten til komponenten.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: { en: 'Description', nb: 'Beskrivelse' },
      description: {
        en: 'Description, optionally shown below the title',
        nb: 'Valgfri beskrivelse som vises under ledeteksten.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: { en: 'Help', nb: 'Hjelp' },
      description: {
        en: 'Help text, optionally shown next to the title',
        nb: 'Valgfri hjelpetekst som vises ved ledeteksten.',
      },
    }),
  );
