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
    displayData: false,
  },
})
  .addProperty(new CG.prop('title', new CG.str()))
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'data',
        new CG.dataModelBinding()
          .setTitle('Data')
          .setDescription(
            'Dot notation location for a repeating group structure (array of objects), where the data is stored',
          ),
      ),
    ),
  );
