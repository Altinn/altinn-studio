import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Liste over vedlegg', en: 'AttachmentList' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'Title shown above the attachment list', nb: 'Ledeteksten som vises over vedleggslisten.' },
    }),
  )
  .addProperty(
    new CG.prop(
      'dataTypeIds',
      new CG.arr(new CG.str())
        .optional()
        .setTitle('Data type IDs', 'Datatype-ID-er')
        .setDescription(
          'List of data type IDs for the attachment list to show',
          'Liste over datatype-ID-ene som vedleggslisten skal vise.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'links',
      new CG.bool()
        .optional({ default: true })
        .setTitle('Link to each attachment', 'Lenke til hvert vedlegg')
        .setDescription(
          'Disable this to remove the link to each attachment',
          'Slå av for å fjerne lenken til hvert vedlegg.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'groupByDataTypeGrouping',
      new CG.bool()
        .optional({ default: false })
        .setDescription(
          'Group attachments by their data type grouping',
          'Grupperer vedlegg etter datatypens gruppering.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'showDataTypeDescriptions',
      new CG.bool()
        .optional({ default: false })
        .setDescription(
          'Show the corresponding data type description for each attachment',
          'Viser beskrivelsen av den tilhørende datatypen for hvert vedlegg.',
        ),
    ),
  );
