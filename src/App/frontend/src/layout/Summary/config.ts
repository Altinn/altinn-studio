import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Oppsummering', en: 'Summary' },
    lifecycle: { status: 'deprecated', replacedBy: 'Summary2' },
  },
  directRendering: true,
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
  .addProperty(
    new CG.prop(
      'componentRef',
      new CG.str()
        .setTitle('Component reference', 'Komponentreferanse')
        .setDescription(
          'String value indicating which layout component (by ID) the summary is for.',
          'ID-en til komponenten som oppsummeringen gjelder.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'largeGroup',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Large group', 'Stor gruppe')
        .setDescription(
          'Boolean value indicating if summary of repeating group should be displayed in large format. ' +
            'Useful for displaying summary with nested groups.',
          'Angir om oppsummeringen av den repeterende gruppen skal vises i stort format.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'excludedChildren',
      new CG.arr(new CG.str())
        .optional()
        .setTitle('Excluded child components', 'Utelatte underkomponenter')
        .setDescription(
          "Array of component IDs that should not be shown in a repeating group's summary",
          'Liste over komponent-ID-er som ikke skal vises i oppsummeringen av en repeterende gruppe.',
        ),
    ),
  )
  .addTextResource(
    new CG.trb({
      name: 'returnToSummaryButtonTitle',
      description: {
        en: 'Used to specify the text on the NavigationButtons component that should be used after clicking "Change" on the summary component',
        nb: 'Angir teksten i NavigationButtons-komponenten etter at brukeren har valgt «Endre» i oppsummeringen.',
      },
      title: { en: 'ReturnToSummaryButtonTitle', nb: 'Tekst på tilbakeknapp til oppsummering' },
    }),
  )
  .addProperty(
    new CG.prop(
      'display',
      new CG.obj(
        new CG.prop(
          'hideChangeButton',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Hide change button', 'Skjul endringsknappen')
            .setDescription(
              'Set to true if the change button should be hidden for the summary component. False by default.',
              'Skjuler endringsknappen i oppsummeringskomponenten.',
            ),
        ),
        new CG.prop(
          'hideValidationMessages',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Hide validation messages', 'Skjul valideringsmeldinger')
            .setDescription(
              'Set to true if the validation messages should be hidden for the component when shown in Summary. ' +
                'False by default.',
              'Skjuler valideringsmeldingene når komponenten vises i Summary.',
            ),
        ),
        new CG.prop(
          'useComponentGrid',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Use component grid', 'Bruk komponentens rutenett')
            .setDescription(
              'Set to true to allow summary component to use the grid setup of the referenced component. ' +
                'For group summary, this will apply for all group child components.',
              'Lar oppsummeringskomponenten bruke rutenettinnstillingene fra komponenten den refererer til.',
            ),
        ),
        new CG.prop(
          'hideBottomBorder',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Hide bottom border', 'Skjul nederste kantlinje')
            .setDescription(
              'Set to true to hide the blue dashed border below the summary component. False by default.',
              'Skjuler den blå, stiplede linjen under oppsummeringskomponenten.',
            ),
        ),
        new CG.prop(
          'nextButton',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Display the next button', 'Vis neste-knappen')
            .setDescription(
              'Set to to true display a "next" button as well as the return to summary button',
              'Viser en «Neste»-knapp i tillegg til knappen som går tilbake til oppsummeringen.',
            ),
        ),
      )
        .exportAs('SummaryDisplayProperties')
        .optional()
        .setTitle('Display properties', 'Visningsinnstillinger')
        .setDescription(
          'Optional properties to configure how summary is displayed',
          'Valgfrie egenskaper som styrer hvordan oppsummeringen vises.',
        ),
    ),
  );
