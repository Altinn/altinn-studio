import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Video', en: 'Video' },
    lifecycle: { status: 'stable' },
  },
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
      title: { en: 'Alt text', nb: 'Alternativ tekst' },
      description: {
        en: 'Alternative text for the video (for screen readers).',
        nb: 'Alternativ tekst for videoen, beregnet på skjermlesere.',
      },
    }),
  )
  .addProperty(
    new CG.prop(
      'video',
      new CG.obj(
        new CG.prop(
          'src',
          new CG.obj(
            new CG.prop(
              'nb',
              new CG.str()
                .optional()
                .setTitle('Video source (when using norwegian bokmål language)', 'Videokilde for norsk bokmål'),
            ),
            new CG.prop(
              'nn',
              new CG.str()
                .optional()
                .setTitle('Video source (when using norwegian nynorsk language)', 'Videokilde for norsk nynorsk'),
            ),
            new CG.prop(
              'en',
              new CG.str().optional().setTitle('Video source (when using english language)', 'Videokilde for engelsk'),
            ),
          )
            .additionalProperties(
              new CG.str()
                .optional()
                .setTitle('Video source (when using other languages)', 'Videokilde for andre språk'),
            )
            .addExample({
              nb: 'https://example.com/video.mp4',
              nn: 'https://example.com/video.mp4',
              en: 'https://example.com/video.mp4',
            })
            .setTitle('Video sources', 'Videokilder')
            .setDescription('Video sources for each supported language.', 'Videokilder for hvert språk appen støtter.')
            .exportAs('VideoSrc'),
        ),
      )
        .optional()
        .setTitle('Video settings', 'Videoinnstillinger')
        .setDescription('Configures the video sources.', 'Konfigurerer videokildene.')
        .exportAs('IVideo'),
    ),
  );
