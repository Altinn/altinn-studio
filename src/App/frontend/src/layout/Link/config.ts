import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Action,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Lenke', en: 'Link' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: true,
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
      name: 'target',
      title: { en: 'Target', nb: 'Mål' },
      description: { en: 'The target of the link', nb: 'Målet for lenken.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: { en: 'Title', nb: 'Ledetekst' },
      description: { en: 'The title/text of the link', nb: 'Teksten på lenken.' },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'download',
      title: { en: 'Download', nb: 'Last ned' },
      description: {
        en: 'Download target instead of navigating to it. Non-blank value is passed to the download attribute and becomes the filename of the downloaded file. Blank value means default filename is used.',
        nb: 'Laster ned målet i stedet for å navigere til det. En verdi brukes som filnavn for den nedlastede filen. En tom verdi bruker standardfilnavnet.',
      },
    }),
  )
  .addProperty(
    new CG.prop(
      'style',
      new CG.enum('primary', 'secondary', 'link')
        .exportAs('LinkStyle')
        .setTitle('Style', 'Stil')
        .setDescription(
          'The style of the link (a primary/secondary button, or an actual link)',
          'Lenkens stil: primary- eller secondary-knapp, eller vanlig lenke.',
        ),
    ),
  )
  .extends(CG.common('IButtonProps'))
  .addProperty(
    new CG.prop(
      'openInNewTab',
      new CG.bool()
        .optional()
        .setTitle('Open in new tab', 'Åpne i ny fane')
        .setDescription('Open the link in a new tab', 'Åpner lenken i en ny fane.'),
    ),
  );
