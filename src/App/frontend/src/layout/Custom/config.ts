import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Egendefinert', en: 'Custom' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
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
  .addDataModelBinding(
    new CG.obj().optional().additionalProperties(new CG.dataModelBinding()).exportAs('IDataModelBindingsForCustom'),
  )
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: {
        en: 'Title (passed on as the "text" property to the component)',
        nb: 'Ledeteksten, sendt til komponentens «text»-egenskap.',
      },
    }),
  )
  .addProperty(
    new CG.prop(
      'tagName',
      new CG.str()
        .setTitle('Tag name', 'Taggnavn')
        .setDescription('Web component tag name to use', 'Navnet på web component-taggen som skal brukes.'),
    ),
  );
