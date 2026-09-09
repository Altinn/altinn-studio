import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Finn virksomhet', en: 'OrganisationLookup' },
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
        'orgnr',
        new CG.dataModelBinding()
          .setTitle('Data binding for organization number', 'Databinding for organisasjonsnummer')
          .setDescription(
            'Describes the location in the data model where the component should store the organization number of the organization to look up.',
            'Angir hvor i datamodellen komponenten skal lagre organisasjonsnummeret til organisasjonen som slås opp.',
          ),
      ),
      new CG.prop(
        'name',
        new CG.dataModelBinding()
          .setTitle('Data binding for organization name', 'Databinding for organisasjonsnavn')
          .setDescription(
            'Describes the location in the data model where the component should store the name of the organization.',
            'Angir hvor i datamodellen komponenten skal lagre organisasjonsnavnet.',
          )
          .optional(),
      ),
    ),
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
      title: { en: 'Help Text', nb: 'Hjelpetekst' },
      description: {
        en: 'Help text, optionally shown next to the title',
        nb: 'Valgfri hjelpetekst som vises ved ledeteksten.',
      },
    }),
  );
