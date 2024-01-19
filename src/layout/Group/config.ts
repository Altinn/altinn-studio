import { CG, Variant } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Container,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
});

// Remove these so they're not set to undefined, as is the default for all other components. We override these anyway.
Config.inner.removeProperty('textResourceBindings');
Config.inner.removeProperty('dataModelBindings');

Config.overrideExported(
  new CG.union(
    makeNonRepeatingGroup()
      .extends(Config)
      .extends(CG.common('SummarizableComponentProps'))
      .extendTextResources(CG.common('TRBSummarizable'))
      .inner.exportAs('CompGroupNonRepeating'),
  ),
);

function makeNonRepeatingGroup() {
  return new CG.componentLike()
    .addProperty(
      new CG.prop('dataModelBindings', new CG.raw({ typeScript: 'undefined' }).optional()).onlyIn(Variant.Internal),
    )
    .addTextResource(
      new CG.trb({
        name: 'title',
        title: 'Title',
        description: 'The title of the group (shown above the group)',
      }),
    )
    .addTextResource(
      new CG.trb({
        name: 'description',
        title: 'Description',
        description: 'The description text shown underneath the title',
      }),
    )
    .addProperty(new CG.prop('childComponents', new CG.arr(CG.layoutNode)).onlyIn(Variant.Internal))
    .addProperty(
      new CG.prop(
        'groupingIndicator',
        new CG.enum('indented', 'panel')
          .optional()
          .setTitle('Set grouping indicator')
          .setDescription('Can visually group components together by indenting them or by putting them in a panel. '),
      ),
    )
    .addProperty(
      new CG.prop(
        'children',
        new CG.arr(new CG.str())
          .setTitle('Children')
          .setDescription('Array of component IDs that should be displayed in the group'),
      ).onlyIn(Variant.External),
    );
}
