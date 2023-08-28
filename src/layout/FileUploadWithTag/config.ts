import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { asUploaderComponent } from 'src/layout/FileUpload/config';

export const Config = asUploaderComponent(
  new CG.component({
    category: CompCategory.Form,
    rendersWithLabel: true,
    capabilities: {
      renderInTable: false,
      renderInButtonGroup: false,
      renderInAccordion: false,
      renderInAccordionGroup: false,
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
  .addProperty(
    new CG.prop(
      'optionsId',
      new CG.str()
        .setTitle('Dynamic options (fetched from server)')
        .setDescription('ID of the option list to fetch from the server'),
    ),
  )
  .addProperty(new CG.prop('mapping', CG.common('IMapping').optional()));
