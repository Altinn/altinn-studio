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
      description: 'Alternative text for the audio (for screen readers).',
    }),
  )
  .addProperty(
    new CG.prop(
      'audio',
      new CG.obj(
        new CG.prop(
          'src',
          new CG.obj(
            new CG.prop('nb', new CG.str().optional().setTitle('Audio source (when using norwegian bokmål language)')),
            new CG.prop('nn', new CG.str().optional().setTitle('Audio source (when using norwegian nynorsk language)')),
            new CG.prop('en', new CG.str().optional().setTitle('Audio source (when using english language)')),
          )
            .additionalProperties(new CG.str().optional().setTitle('Audio source (when using other languages)'))
            .addExample({
              nb: 'https://example.com/audio.mp3',
              nn: 'https://example.com/audio.mp3',
              en: 'https://example.com/audio.mp3',
            })
            .exportAs('AudioSrc'),
        ),
      )
        .optional()
        .exportAs('IAudio'),
    ),
  );
