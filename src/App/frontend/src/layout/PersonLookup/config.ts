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
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'ssn',
        new CG.dataModelBinding()
          .setTitle('Data model binding for social security number')
          .setDescription(
            'Describes the location in the data model where the component should store the ssn of the person to look up.',
          ),
      ),
      new CG.prop(
        'fullName',
        new CG.dataModelBinding()
          .optional()
          .setTitle('Data model binding for the full name of a person')
          .setDescription(
            'Describes the location in the data model where the component should store the name of the person to look up.',
          ),
      ),
      new CG.prop(
        'lastName',
        new CG.dataModelBinding()
          .optional()
          .setTitle('Data model binding for the last name of a person')
          .setDescription(
            'Describes the location in the data model where the component should store the last name of the person to look up.',
          ),
      ),
      new CG.prop(
        'middleName',
        new CG.dataModelBinding()
          .optional()
          .setTitle('Data model binding for the middle name of a person')
          .setDescription(
            'Describes the location in the data model where the component should store the middle name of the person to look up.',
          ),
      ),
      new CG.prop(
        'firstName',
        new CG.dataModelBinding()
          .optional()
          .setTitle('Data model binding for the first name of a person')
          .setDescription(
            'Describes the location in the data model where the component should store the first name of the person to look up.',
          ),
      ),
    ).exportAs('IDataModelBindingsForPersonLookup'),
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
      title: 'Help',
      description: 'Help text, optionally shown next to the title',
    }),
  );
