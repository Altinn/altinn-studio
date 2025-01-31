import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: true,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addDataModelBinding(
    new CG.obj().optional().additionalProperties(new CG.dataModelBinding()).exportAs('IDataModelBindingsForCustom'),
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
