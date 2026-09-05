import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { asOptionsComponent } from 'src/features/options/config';

export const Config = asOptionsComponent(
  new CG.component({
    category: CompCategory.Form,
    availability: 'internal',
    metadata: {
      name: {
        nb: 'LikertItem',
        en: 'LikertItem',
      },
    },
    capabilities: {
      renderInTable: false,
      renderInButtonGroup: false,
      renderInAccordion: false,
      renderInAccordionGroup: false,
      renderInCards: false,
      renderInCardsMedia: false,
      renderInTabs: false,
    },
    functionality: {
      customExpressions: false,
    },
  }),
  { supportsPreselection: true },
)
  .addDataModelBinding(CG.common('IDataModelBindingsOptionsSimple'))
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'Title of the Likert component/row', nb: 'Ledeteksten til Likert-komponenten eller raden.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: { en: 'Description', nb: 'Beskrivelse' },
      description: {
        en: 'Description of the Likert component/row',
        nb: 'Beskrivelse av Likert-komponenten eller raden.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: { en: 'Help', nb: 'Hjelp' },
      description: {
        en: 'Help text of the Likert component/row',
        nb: 'Hjelpetekst for Likert-komponenten eller raden.',
      },
    }),
  )
  .addProperty(
    new CG.prop(
      'showLabelsInTable',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Show label when single option in table', 'Vis ledetekst ved ett alternativ i tabellen')
        .setDescription(
          'Boolean value indicating if the label should be visible when only one option exists in table',
          'Angir om ledeteksten skal vises når tabellen bare har ett alternativ.',
        ),
    ),
  )
  .extends(CG.common('ILikertColumnProperties'))
  .addProperty(new CG.prop('layout', CG.common('LayoutStyle').optional()));
