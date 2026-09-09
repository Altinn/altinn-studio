import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Container,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Cards', en: 'Cards' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCardsMedia: false,
    renderInCards: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addProperty(
    new CG.prop(
      'mediaPosition',
      new CG.enum('top', 'bottom')
        .optional({ default: 'top' })
        .setTitle('ImagePosition', 'Bildeplassering')
        .setDescription(
          'Position of the media (image/video/audio) in each card',
          'Plasseringen av mediet, bilde, video eller lyd, i hvert kort.',
        )
        .exportAs('CardsMediaPosition'),
    ),
  )
  .addProperty(
    new CG.prop(
      'minMediaHeight',
      new CG.str()
        .setTitle('minMediaHeight', 'minste mediehøyde')
        .setDescription(
          'Fixed minimum height of media (if media is present)',
          'Fast minimumshøyde for mediet, hvis kortet har et medium.',
        )
        .optional({ default: '150px' })
        .addExample('100px', '100%', '100rem'),
    ),
  )
  .addProperty(
    new CG.prop(
      'minWidth',
      new CG.str()
        .setTitle('minWidth', 'minste bredde')
        .setDescription('Fixed minimum width of the card', 'Fast minimumsbredde for kortet.')
        .optional({ default: '250px' })
        .setPattern(/^[0-9]+(px|rem|%)?$/)
        .addExample('100', '100px', '100%', '100rem'),
    ),
  )
  .addProperty(
    new CG.prop(
      'color',
      new CG.enum('neutral', 'subtle')
        .setTitle('Card color', 'Kortfarge')
        .setDescription('The color style for these cards', 'Fargestilen for kortene.')
        .exportAs('CardsColor'),
    ),
  )
  .addProperty(
    new CG.prop(
      'cards',
      new CG.arr(
        new CG.obj(
          new CG.prop(
            'media',
            new CG.str()
              .setTitle('Media', 'Medium')
              .setDescription(
                'Media to display on the top/bottom of the card (must reference an Image, Audio or Video component',
                'Mediet som vises øverst eller nederst i kortet. Må referere til en Image-, Audio- eller Video-komponent.',
              )
              .optional(),
          ),
          new CG.prop(
            'title',
            new CG.str()
              .setTitle('Title', 'Ledetekst')
              .setDescription('Title of the card', 'Kortets tittel.')
              .optional(),
          ),
          new CG.prop(
            'description',
            new CG.str()
              .setTitle('Description/body text', 'Beskrivelse/brødtekst')
              .setDescription(
                'Full text displayed underneath the title, above any component children',
                'Hele teksten som vises under tittelen og over eventuelle underkomponenter.',
              )
              .optional(),
          ),
          new CG.prop(
            'footer',
            new CG.str()
              .setTitle('Footer', 'Bunntekst')
              .setDescription('Footer text of the card', 'Bunnteksten i kortet.')
              .optional(),
          ),
          new CG.prop(
            'children',
            new CG.arr(new CG.str())
              .setTitle('Children', 'Underkomponenter')
              .setDescription(
                'Child component IDs to show inside the card',
                'ID-ene til komponentene som skal vises i kortet.',
              )
              .optional(),
          ),
        ).exportAs('CardConfig'),
      ),
    ),
  );
