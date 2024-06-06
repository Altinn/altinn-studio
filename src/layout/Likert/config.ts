import { CG, Variant } from 'src/codegen/CG';
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
      description: 'The title of the group',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: 'Description',
      description: 'The description text for the Likert table.',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'leftColumnHeader',
      title: 'Left column header',
      description: 'The header text for the left column in the Likert table',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'questions',
      title: 'Questions',
      description: 'The questions to be displayed in each row (use a dynamic text resource)',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'questionDescriptions',
      title: 'Question descriptions',
      description: 'The descriptions to be displayed in each row (use a dynamic text resource)',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'questionHelpTexts',
      title: 'Question help texts',
      description: 'The help texts to be displayed in each row (use a dynamic text resource)',
    }),
  )
  .addProperty(
    new CG.prop(
      'rows',
      new CG.arr(
        new CG.obj(
          new CG.prop('uuid', new CG.str()),
          new CG.prop('index', new CG.num()),
          new CG.prop('items', new CG.arr(CG.layoutNode)),
          new CG.prop(
            'likertExpressions',
            new CG.import({
              import: 'HLikertExpressions',
              from: 'src/layout/Likert/types',
            }).optional(),
          ),
        ).exportAs('HLikertRow'),
      ).exportAs('HLikertRows'),
    ).onlyIn(Variant.Internal),
  )
  .addDataModelBinding(CG.common('IDataModelBindingsLikert'))
  .addProperty(
    new CG.prop(
      'filter',
      new CG.arr(
        new CG.obj(
          new CG.prop('key', new CG.enum('start', 'stop')),
          new CG.prop('value', new CG.union(new CG.str().setPattern(/^\d+$/), new CG.num())),
        ),
      )
        .optional()
        .setTitle('Filter')
        .setDescription(
          'Optionally filter specific rows within the likert group using start/stop indexes for displaying the desired ones' +
            '(beware that start index starts at zero, and stop index starts at one, so {start, stop} = {0, 3} will display 3 rows, not 4)',
        )
        .exportAs('ILikertFilter'),
    ),
  )
  .makeSelectionComponent(false);
