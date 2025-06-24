import { CG } from 'src/codegen/CG';
import { CardsPlugin } from 'src/layout/Cards/CardsPlugin';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Container,
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
  .addPlugin(new CardsPlugin())
  .addProperty(
    new CG.prop(
      'mediaPosition',
      new CG.enum('top', 'bottom')
        .optional({ default: 'top' })
        .setTitle('ImagePosition')
        .setDescription('Position of the media (image/video/audio) in each card')
        .exportAs('CardsMediaPosition'),
    ),
  )
  .addProperty(
    new CG.prop(
      'minMediaHeight',
      new CG.str()
        .setTitle('minMediaHeight')
        .setDescription('Fixed minimum height of media (if media is present)')
        .optional({ default: '150px' })
        .addExample('100px', '100%', '100rem'),
    ),
  )
  .addProperty(
    new CG.prop(
      'minWidth',
      new CG.str()
        .setTitle('minWidth')
        .setDescription('Fixed minimum width of the card')
        .optional({ default: '250px' })
        .setPattern(/^[0-9]+(px|rem|%)?$/)
        .addExample('100', '100px', '100%', '100rem'),
    ),
  )
  .addProperty(
    new CG.prop(
      'color',
      new CG.enum('neutral', 'subtle')
        .setTitle('Card color')
        .setDescription('The color style for these cards')
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
              .setTitle('Media')
              .setDescription(
                'Media to display on the top/bottom of the card (must reference an Image, Audio or Video component',
              )
              .optional(),
          ),
          new CG.prop('title', new CG.str().setTitle('Title').setDescription('Title of the card').optional()),
          new CG.prop(
            'description',
            new CG.str()
              .setTitle('Description/body text')
              .setDescription('Full text displayed underneath the title, above any component children')
              .optional(),
          ),
          new CG.prop('footer', new CG.str().setTitle('Footer').setDescription('Footer text of the card').optional()),
          new CG.prop(
            'children',
            new CG.arr(new CG.str())
              .setTitle('Children')
              .setDescription('Child component IDs to show inside the card')
              .optional(),
          ),
        ).exportAs('CardConfig'),
      ),
    ),
  );
