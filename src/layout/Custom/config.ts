import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: true,
  },
})
  .addDataModelBinding(
    new CG.obj().optional().additionalProperties(new CG.str()).exportAs('IDataModelBindingsForCustom'),
  )
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'Title (passed on as the "text" property to the component)',
    }),
  )
  .addProperty(
    new CG.prop('tagName', new CG.str().setTitle('Tag name').setDescription('Web component tag name to use')),
  );
