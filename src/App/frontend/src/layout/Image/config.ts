import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: true,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addTextResource(
    new CG.trb({
      name: 'altTextImg',
      title: 'Alt text',
      description: 'Alternative text for the image (for screen readers).',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: 'Help text',
      description: 'Help text for the image (shown in help text tooltip/popup)',
    }),
  )
  .addProperty(
    new CG.prop(
      'image',
      new CG.obj(
        new CG.prop(
          'src',
          new CG.obj(
            new CG.prop('nb', new CG.str().optional().setTitle('Image source (when using norwegian bokmål language)')),
            new CG.prop('nn', new CG.str().optional().setTitle('Image source (when using norwegian nynorsk language)')),
            new CG.prop('en', new CG.str().optional().setTitle('Image source (when using english language)')),
          )
            .additionalProperties(new CG.str().optional().setTitle('Image source (when using other languages)'))
            .addExample({
              nb: 'https://example.com/bilde.png',
              nn: 'https://example.com/bilete.png',
              en: 'https://example.com/image.png',
            })
            .exportAs('IImageSrc'),
        ),
        new CG.prop('width', new CG.str().setTitle('Image width').addExample('100%')),
        new CG.prop(
          'align',
          new CG.enum('flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly')
            .setTitle('Justification/alignment')
            .setDescription('Justification/alignment of the image')
            .exportAs('GridJustification'),
        ),
      )
        .optional()
        .exportAs('IImage'),
    ),
  );
