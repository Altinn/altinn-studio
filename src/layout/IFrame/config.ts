import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Presentation,
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
      title: 'Title/text/content',
      description:
        'The content of the IFrame. Can for example be be set to a string containing HTML, a text resource key, or ' +
        'an expression looking up a value from the data model',
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
            .setTitle('Allow popups')
            .setDescription(
              'Sets "allow-popups" in the sandbox attribute on the iframe. ' +
                'See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox',
            ),
        ),
        new CG.prop(
          'allowPopupsToEscapeSandbox',
          new CG.bool()
            .optional({ default: false })
            .setTitle('Allow popups to escape sandbox')
            .setDescription(
              'Sets "allow-popups-to-escape-sandbox" in the sandbox attribute on the iframe. ' +
                'See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox',
            ),
        ),
      )
        .optional()
        .exportAs('ISandboxProperties'),
    ),
  );
