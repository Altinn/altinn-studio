import { CG } from 'src/codegen/CG';
import { AttachmentsPlugin } from 'src/features/attachments/AttachmentsPlugin';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
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
})
  .addPlugin(new AttachmentsPlugin())
  .extendTextResources(CG.common('TRBLabel'))
  .addProperty(
    new CG.prop(
      'crop',
      new CG.union(
        new CG.obj(
          new CG.prop('shape', new CG.const('circle').setTitle('Shape').setDescription('Circular cropping area')),
          new CG.prop(
            'diameter',
            new CG.num().optional({ default: 250 }).setTitle('Diameter').setDescription('Diameter of the circle'),
          ),
        ).exportAs('CropConfigCircle'),
        new CG.obj(
          new CG.prop('shape', new CG.const('rectangle').setTitle('Shape').setDescription('Rectangular cropping area')),
          new CG.prop(
            'width',
            new CG.num().optional({ default: 250 }).setTitle('Width').setDescription('Width of the rectangle'),
          ),
          new CG.prop(
            'height',
            new CG.num().optional({ default: 250 }).setTitle('Height').setDescription('Height of the rectangle'),
          ),
        ).exportAs('CropConfigRect'),
      )
        .setUnionType('discriminated')
        .optional({ default: { shape: 'circle', diameter: 250 } })
        .exportAs('CropConfig'),
    ),
  )
  .addDataModelBinding(CG.common('IDataModelBindingsSimple').optional())
  .extends(CG.common('LabeledComponentProps'))
  .addSummaryOverrides();
