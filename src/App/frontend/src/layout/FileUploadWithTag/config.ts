import { CG } from 'src/codegen/CG';
import { OptionsPlugin } from 'src/features/options/OptionsPlugin';
import { CompCategory } from 'src/layout/common';
import { asUploaderComponent } from 'src/layout/FileUpload/config';

export const Config = asUploaderComponent(
  new CG.component({
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
  }),
)
  .addTextResource(
    new CG.trb({
      name: 'tagTitle',
      title: 'Tag title',
      description: 'The title to show when selecting a tag for each uploaded file',
    }),
  )
  .addPlugin(new OptionsPlugin({ supportsPreselection: false, type: 'single' }));
