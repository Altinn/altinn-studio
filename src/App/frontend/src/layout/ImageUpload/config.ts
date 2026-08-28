import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { asAttachmentUploader } from 'src/features/attachments/config';

export const Config = asAttachmentUploader(
  new CG.component({
    category: CompCategory.Form,
    availability: 'configurable',
    metadata: {
      name: { nb: 'Bildeopplaster', en: 'Image Uploader' },
      lifecycle: { status: 'stable' },
    },
    capabilities: {
      renderInTable: true,
      renderInButtonGroup: false,
      renderInAccordion: true,
      renderInAccordionGroup: false,
      renderInTabs: true,
      renderInCards: true,
      renderInCardsMedia: false,
    },
    functionality: {
      customExpressions: true,
    },
  }),
)
  .extendTextResources(CG.common('TRBLabel'))
  .addProperty(
    new CG.prop(
      'crop',
      new CG.union(
        new CG.obj(
          new CG.prop(
            'shape',
            new CG.const('circle')
              .setTitle('Shape', 'Form')
              .setDescription('Circular cropping area', 'Sirkelformet beskjæringsområde.'),
          ),
          new CG.prop(
            'diameter',
            new CG.num()
              .optional({ default: 250 })
              .setTitle('Diameter', 'Diameter')
              .setDescription('Diameter of the circle', 'Sirkelens diameter.'),
          ),
        ).exportAs('CropConfigCircle'),
        new CG.obj(
          new CG.prop(
            'shape',
            new CG.const('rectangle')
              .setTitle('Shape', 'Form')
              .setDescription('Rectangular cropping area', 'Rektangulært beskjæringsområde.'),
          ),
          new CG.prop(
            'width',
            new CG.num()
              .optional({ default: 250 })
              .setTitle('Width', 'Bredde')
              .setDescription('Width of the rectangle', 'Rektangelets bredde.'),
          ),
          new CG.prop(
            'height',
            new CG.num()
              .optional({ default: 250 })
              .setTitle('Height', 'Høyde')
              .setDescription('Height of the rectangle', 'Rektangelets høyde.'),
          ),
        ).exportAs('CropConfigRect'),
      )
        .setUnionType('discriminated')
        .optional({ default: { shape: 'circle', diameter: 250 } })
        .setTitle('Cropping area', 'Beskjæringsområde')
        .setDescription(
          'Configures the shape and size of the image cropping area.',
          'Konfigurerer formen og størrelsen på beskjæringsområdet.',
        )
        .exportAs('CropConfig'),
    ),
  )
  .addDataModelBinding(CG.common('IDataModelBindingsSimple').optional())
  .extends(CG.common('LabeledComponentProps'))
  .addSummaryOverrides();
