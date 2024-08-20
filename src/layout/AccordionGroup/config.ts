import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NonRepeatingChildrenPlugin } from 'src/utils/layout/plugins/NonRepeatingChildrenPlugin';

export const Config = new CG.component({
  category: CompCategory.Container,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'The title of the accordion group',
    }),
  )
  .addPlugin(
    new NonRepeatingChildrenPlugin({
      onlyWithCapability: 'renderInAccordionGroup',
      description: 'List of child component IDs to show inside the Accordion (limited to a few component types)',
    }),
  );
