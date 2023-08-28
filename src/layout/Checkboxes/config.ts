import { CG, Variant } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
})
  .makeSelectionComponent()
  .addDataModelBinding(CG.common('IDataModelBindingsSimple').optional({ onlyIn: Variant.Internal }))
  .addProperty(new CG.prop('layout', CG.common('LayoutStyle').optional()));

// We don't render the label in GenericComponent, but we still need the
// text resource bindings for rendering them on our own
Config.addTextResourcesForLabel().inner.extends(CG.common('LabeledComponentProps'));
