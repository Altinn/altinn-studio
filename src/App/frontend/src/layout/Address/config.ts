import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Adresse', en: 'Address' },
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
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'Title of the component', nb: 'Ledeteksten til komponenten.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'careOfTitle',
      title: { en: 'Care Of Title', nb: 'Ledetekst for c/o' },
      description: { en: 'Title for care-of', nb: 'Ledetekst for c/o.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'zipCodeTitle',
      title: { en: 'Zip Code Title', nb: 'Ledetekst for postnummer' },
      description: { en: 'Title for the zip code', nb: 'Ledetekst for postnummer.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'postPlaceTitle',
      title: { en: 'Post place Title', nb: 'Ledetekst for poststed' },
      description: { en: 'Title for post place', nb: 'Ledetekst for poststed.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'houseNumberTitle',
      title: { en: 'House number Title', nb: 'Ledetekst for husnummer' },
      description: { en: 'Title for house number', nb: 'Ledetekst for husnummer.' },
    }),
  )
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'address',
        new CG.dataModelBinding()
          .setTitle('Data model binding for address', 'Datamodellbinding for adresse')
          .setDescription(
            'Describes the location in the data model where the component should store the address.',
            'Angir hvor i datamodellen komponenten skal lagre adressen.',
          ),
      ),
      new CG.prop(
        'zipCode',
        new CG.dataModelBinding()
          .setTitle('Data model binding for zip code', 'Datamodellbinding for postnummer')
          .setDescription(
            'Describes the location in the data model where the component should store the zip code.',
            'Angir hvor i datamodellen komponenten skal lagre postnummeret.',
          ),
      ),
      new CG.prop(
        'postPlace',
        new CG.dataModelBinding()
          .setTitle('Data model binding for post place', 'Datamodellbinding for poststed')
          .setDescription(
            'Describes the location in the data model where the component should store the post place.',
            'Angir hvor i datamodellen komponenten skal lagre poststedet.',
          ),
      ),
      new CG.prop(
        'careOf',
        new CG.dataModelBinding()
          .setTitle('Data model binding for care of', 'Datamodellbinding for c/o')
          .setDescription(
            'Describes the location in the data model where the component should store care of.',
            'Angir hvor i datamodellen komponenten skal lagre c/o-adressen.',
          )
          .optional(),
      ),
      new CG.prop(
        'houseNumber',
        new CG.dataModelBinding()
          .setTitle('Data model binding for house number', 'Datamodellbinding for husnummer')
          .setDescription(
            'Describes the location in the data model where the component should store the house number.',
            'Angir hvor i datamodellen komponenten skal lagre husnummeret.',
          )
          .optional(),
      ),
    ).exportAs('IDataModelBindingsForAddress'),
  )
  .addProperty(new CG.prop('saveWhileTyping', CG.common('SaveWhileTyping').optional({ default: true })))
  .addProperty(
    new CG.prop(
      'simplified',
      new CG.bool()
        .optional({ default: true })
        .setTitle('Simplified', 'Forenklet')
        .setDescription(
          'Whether to use the simplified address input or not',
          'Angir om det forenklede adressefeltet skal brukes.',
        ),
    ),
  )
  .extends(CG.common('LabeledComponentProps'));
