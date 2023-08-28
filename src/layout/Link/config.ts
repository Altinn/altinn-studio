import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Action,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
})
  .addTextResource(
    new CG.trb({
      name: 'target',
      title: 'Target',
      description: 'The target of the link',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'The title/text of the link',
    }),
  )
  .addProperty(
    new CG.prop(
      'style',
      new CG.enum('primary', 'secondary', 'link')
        .exportAs('LinkStyle')
        .setTitle('Style')
        .setDescription('The style of the link (a primary/secondary button, or an actual link)'),
    ),
  )
  .addProperty(
    new CG.prop(
      'openInNewTab',
      new CG.bool().optional().setTitle('Open in new tab').setDescription('Open the link in a new tab'),
    ),
  );
