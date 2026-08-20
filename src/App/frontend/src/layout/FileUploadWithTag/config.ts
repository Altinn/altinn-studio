import { CG } from 'src/codegen/CG';
import { asOptionsComponent } from 'src/features/options/config';
import { CompCategory } from 'src/layout/common';
import { asUploaderComponent } from 'src/layout/FileUpload/config';

export const Config = asOptionsComponent(
  asUploaderComponent(
    new CG.component({
      category: CompCategory.Form,
      availability: 'configurable',
      metadata: {
        name: { nb: 'FileUploadWithTag', en: 'FileUploadWithTag' },
        lifecycle: { status: 'stable' },
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
      },
    }),
  ).addTextResource(
    new CG.trb({
      name: 'tagTitle',
      title: 'Tag title',
      description: 'The title to show when selecting a tag for each uploaded file',
    }),
  ),
  { supportsPreselection: false },
);
