import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'organisation_lookup_orgnr',
        new CG.dataModelBinding()
          .setTitle('Data binding for organisation number')
          .setDescription(
            'Describes the location in the data model where the component should store the organisation number of the organisation to look up.',
          ),
      ),
      new CG.prop(
        'organisation_lookup_name',
        new CG.dataModelBinding()
          .setTitle('Data binding for organisation name')
          .setDescription(
            'Describes the location in the data model where the component should store the name of the organisation.',
          )
          .optional(),
      ),
    ),
  )
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'The title of the component',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: 'Description',
      description: 'Description, optionally shown below the title',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: 'Help Text',
      description: 'Help text, optionally shown next to the title',
    }),
  );
