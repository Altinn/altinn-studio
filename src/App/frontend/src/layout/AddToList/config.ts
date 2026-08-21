import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'AddToList', en: 'AddToList' },
    lifecycle: { status: 'beta' },
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
    displayData: false,
  },
})
  .addProperty(new CG.prop('title', new CG.str()))
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'data',
        new CG.dataModelBinding()
          .setTitle('Data', 'Data')
          .setDescription(
            'Dot notation location for a repeating group structure (array of objects), where the data is stored',
            'Plassering i punktnotasjon for den repeterende gruppestrukturen, en liste med objekter, der dataene lagres.',
          ),
      ),
    ),
  );
