import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Bilde', en: 'Image' },
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
      name: 'altTextImg',
      title: { en: 'Alt text', nb: 'Alternativ tekst' },
      description: {
        en: 'Alternative text for the image (for screen readers).',
        nb: 'Alternativ tekst for bildet, beregnet på skjermlesere.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: { en: 'Help text', nb: 'Hjelpetekst' },
      description: {
        en: 'Help text for the image (shown in help text tooltip/popup)',
        nb: 'Hjelpetekst for bildet, vist i et hjelpetekstvindu.',
      },
    }),
  )
  .addProperty(
    new CG.prop(
      'image',
      new CG.obj(
        new CG.prop(
          'src',
          new CG.obj(
            new CG.prop(
              'nb',
              new CG.str()
                .optional()
                .setTitle('Image source (when using norwegian bokmål language)', 'Bildekilde for norsk bokmål'),
            ),
            new CG.prop(
              'nn',
              new CG.str()
                .optional()
                .setTitle('Image source (when using norwegian nynorsk language)', 'Bildekilde for norsk nynorsk'),
            ),
            new CG.prop(
              'en',
              new CG.str().optional().setTitle('Image source (when using english language)', 'Bildekilde for engelsk'),
            ),
          )
            .additionalProperties(
              new CG.str()
                .optional()
                .setTitle('Image source (when using other languages)', 'Bildekilde for andre språk'),
            )
            .addExample({
              nb: 'https://example.com/bilde.png',
              nn: 'https://example.com/bilete.png',
              en: 'https://example.com/image.png',
            })
            .setTitle('Image sources', 'Bildekilder')
            .setDescription('Image sources for each supported language.', 'Bildekilder for hvert språk appen støtter.')
            .exportAs('IImageSrc'),
        ),
        new CG.prop('width', new CG.str().setTitle('Image width', 'Bildebredde').addExample('100%')),
        new CG.prop(
          'align',
          new CG.enum('flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly')
            .setTitle('Justification/alignment', 'Justering/plassering')
            .setDescription('Justification/alignment of the image', 'Bildets justering eller plassering.')
            .exportAs('GridJustification'),
        ),
      )
        .optional()
        .setTitle('Image settings', 'Bildeinnstillinger')
        .setDescription(
          'Configures the image source, width, and alignment.',
          'Konfigurerer bildekilde, bredde og plassering.',
        )
        .exportAs('IImage'),
    ),
  );
