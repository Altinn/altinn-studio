import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
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
      title: 'Title',
      description: 'Title of the component',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'careOfTitle',
      title: 'Care Of Title',
      description: 'Title for care-of',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'zipCodeTitle',
      title: 'Zip Code Title',
      description: 'Title for the zip code',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'postPlaceTitle',
      title: 'Post place Title',
      description: 'Title for post place',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'houseNumberTitle',
      title: 'House number Title',
      description: 'Title for house number',
    }),
  )
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'address',
        new CG.dataModelBinding()
          .setTitle('Data model binding for address')
          .setDescription('Describes the location in the data model where the component should store the address.'),
      ),
      new CG.prop(
        'zipCode',
        new CG.dataModelBinding()
          .setTitle('Data model binding for zip code')
          .setDescription('Describes the location in the data model where the component should store the zip code.'),
      ),
      new CG.prop(
        'postPlace',
        new CG.dataModelBinding()
          .setTitle('Data model binding for post place')
          .setDescription('Describes the location in the data model where the component should store the post place.'),
      ),
      new CG.prop(
        'careOf',
        new CG.dataModelBinding()
          .setTitle('Data model binding for care of')
          .setDescription('Describes the location in the data model where the component should store care of.')
          .optional(),
      ),
      new CG.prop(
        'houseNumber',
        new CG.dataModelBinding()
          .setTitle('Data model binding for house number')
          .setDescription('Describes the location in the data model where the component should store the house number.')
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
        .setTitle('Simplified')
        .setDescription('Whether to use the simplified address input or not'),
    ),
  )
  .extends(CG.common('LabeledComponentProps'));
