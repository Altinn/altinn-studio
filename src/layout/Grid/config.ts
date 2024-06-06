import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Container,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
  },
}).addProperty(new CG.prop('rows', CG.common('GridRows')));
// We don't render the label in GenericComponent, but we still need the
// text resource bindings for rendering them on our own
Config.addTextResourcesForLabel().inner.extends(CG.common('LabeledComponentProps'));
