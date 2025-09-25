import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  directRendering: true,
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
  .addProperty(
    new CG.prop(
      'componentRef',
      new CG.str()
        .setTitle('Component reference')
        .setDescription('String value indicating which layout component (by ID) the summary is for.'),
    ),
  )
  .addProperty(
    new CG.prop(
      'largeGroup',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Large group')
        .setDescription(
          'Boolean value indicating if summary of repeating group should be displayed in large format. ' +
            'Useful for displaying summary with nested groups.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'excludedChildren',
      new CG.arr(new CG.str())
        .optional()
        .setTitle('Excluded child components')
        .setDescription("Array of component IDs that should not be shown in a repeating group's summary"),
    ),
  )
  .addTextResource(
    new CG.trb({
      name: 'returnToSummaryButtonTitle',
      description:
        'Used to specify the text on the NavigationButtons component that should be used after clicking "Change" on the summary component',
      title: 'ReturnToSummaryButtonTitle',
    }),
  )
  .addProperty(
    new CG.prop(
      'display',
      new CG.obj(
        new CG.prop(
          'hideChangeButton',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Hide change button')
            .setDescription(
              'Set to true if the change button should be hidden for the summary component. False by default.',
            ),
        ),
        new CG.prop(
          'hideValidationMessages',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Hide validation messages')
            .setDescription(
              'Set to true if the validation messages should be hidden for the component when shown in Summary. ' +
                'False by default.',
            ),
        ),
        new CG.prop(
          'useComponentGrid',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Use component grid')
            .setDescription(
              'Set to true to allow summary component to use the grid setup of the referenced component. ' +
                'For group summary, this will apply for all group child components.',
            ),
        ),
        new CG.prop(
          'hideBottomBorder',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Hide bottom border')
            .setDescription(
              'Set to true to hide the blue dashed border below the summary component. False by default.',
            ),
        ),
        new CG.prop(
          'nextButton',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Display the next button')
            .setDescription('Set to to true display a "next" button as well as the return to summary button'),
        ),
      )
        .exportAs('SummaryDisplayProperties')
        .optional()
        .setTitle('Display properties')
        .setDescription('Optional properties to configure how summary is displayed'),
    ),
  );
