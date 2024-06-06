import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
  },
})
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
      new CG.prop('address', new CG.str()),
      new CG.prop('zipCode', new CG.str()),
      new CG.prop('postPlace', new CG.str()),
      new CG.prop('careOf', new CG.str().optional()),
      new CG.prop('houseNumber', new CG.str().optional()),
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
  );

// Even though this component does not render a label, it's still possible to configure labelSettings on it
Config.inner.extends(CG.common('LabeledComponentProps'));
