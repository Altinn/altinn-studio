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
      name: 'altText',
      title: 'Alt text',
      description: 'Alternative text for the video (for screen readers).',
    }),
  )
  .addProperty(
    new CG.prop(
      'video',
      new CG.obj(
        new CG.prop(
          'src',
          new CG.obj(
            new CG.prop('nb', new CG.str().optional().setTitle('Video source (when using norwegian bokmål language)')),
            new CG.prop('nn', new CG.str().optional().setTitle('Video source (when using norwegian nynorsk language)')),
            new CG.prop('en', new CG.str().optional().setTitle('Video source (when using english language)')),
          )
            .additionalProperties(new CG.str().optional().setTitle('Video source (when using other languages)'))
            .addExample({
              nb: 'https://example.com/video.mp4',
              nn: 'https://example.com/video.mp4',
              en: 'https://example.com/video.mp4',
            })
            .exportAs('VideoSrc'),
        ),
      )
        .optional()
        .exportAs('IVideo'),
    ),
  );
