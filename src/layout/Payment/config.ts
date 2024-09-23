import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const PAYMENT_SUMMARY_OVERRIDE_PROPS = new CG.obj()
  .extends(CG.common('ISummaryOverridesCommon'))
  .optional()
  .setTitle('Summary properties')
  .setDescription('Properties for how to display the summary of the component')
  .exportAs('PaymentSummaryOverrideProps');

export const Config = new CG.component({
  category: CompCategory.Presentation,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
    renderInTabs: false,
  },
  functionality: {
    customExpressions: false,
  },
  directRendering: false,
})

  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'The title of the paragraph',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: 'Description',
      description: 'Description, optionally shown below the title',
    }),
  );
Config.inner.extends(CG.common('SummarizableComponentProps'));
