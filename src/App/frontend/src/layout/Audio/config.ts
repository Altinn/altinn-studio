import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Lyd', en: 'Audio' },
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
        en: 'Alternative text for the audio (for screen readers).',
        nb: 'Alternativ tekst for lydinnholdet, beregnet på skjermlesere.',
      },
    }),
  )
  .addProperty(
    new CG.prop(
      'audio',
      new CG.obj(
        new CG.prop(
          'src',
          new CG.obj(
            new CG.prop(
              'nb',
              new CG.str()
                .optional()
                .setTitle('Audio source (when using norwegian bokmål language)', 'Lydkilde for norsk bokmål'),
            ),
            new CG.prop(
              'nn',
              new CG.str()
                .optional()
                .setTitle('Audio source (when using norwegian nynorsk language)', 'Lydkilde for norsk nynorsk'),
            ),
            new CG.prop(
              'en',
              new CG.str().optional().setTitle('Audio source (when using english language)', 'Lydkilde for engelsk'),
            ),
          )
            .additionalProperties(
              new CG.str().optional().setTitle('Audio source (when using other languages)', 'Lydkilde for andre språk'),
            )
            .addExample({
              nb: 'https://example.com/audio.mp3',
              nn: 'https://example.com/audio.mp3',
              en: 'https://example.com/audio.mp3',
            })
            .setTitle('Audio sources', 'Lydkilder')
            .setDescription('Audio sources for each supported language.', 'Lydkilder for hvert språk appen støtter.')
            .exportAs('AudioSrc'),
        ),
      )
        .optional()
        .setTitle('Audio settings', 'Lydinnstillinger')
        .setDescription('Configures the audio sources.', 'Konfigurerer lydkildene.')
        .exportAs('IAudio'),
    ),
  );
