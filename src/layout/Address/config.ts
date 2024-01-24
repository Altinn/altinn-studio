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
  },
})
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title from Summary',
      description: 'Title of the component (currently only used when referenced from a Summary component)',
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
