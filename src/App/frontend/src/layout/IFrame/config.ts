import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Presentation,
  availability: 'configurable',
  metadata: {
    name: { nb: 'IFrame', en: 'IFrame' },
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
      name: 'title',
      title: { en: 'Title/text/content', nb: 'Tittel/tekst/innhold' },
      description: {
        en:
          'The content of the IFrame. Can for example be set to a string containing HTML, a text resource key, or ' +
          'an expression looking up a value from the data model',
        nb:
          'Innholdet i IFrame-komponenten. Kan være en streng med HTML, en tekstressursnøkkel eller et uttrykk ' +
          'som henter en verdi fra datamodellen.',
      },
    }),
  )
  .addProperty(
    new CG.prop(
      'sandbox',
      new CG.obj(
        new CG.prop(
          'allowPopups',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Allow popups', 'Tillat popupvinduer')
            .setDescription(
              'Sets "allow-popups" in the sandbox attribute on the iframe. ' +
                'See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox',
              'Legger «allow-popups» til i sandbox-attributtet på iframe-elementet.',
            ),
        ),
        new CG.prop(
          'allowPopupsToEscapeSandbox',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Allow popups to escape sandbox', 'Tillat popupvinduer å forlate sandbox')
            .setDescription(
              'Sets "allow-popups-to-escape-sandbox" in the sandbox attribute on the iframe. ' +
                'See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox',
              'Legger «allow-popups-to-escape-sandbox» til i sandbox-attributtet på iframe-elementet.',
            ),
        ),
      )
        .optional()
        .exportAs('ISandboxProperties'),
    ),
  );
