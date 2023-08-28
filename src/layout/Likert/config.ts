import { CG, Variant } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  rendersWithLabel: false,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
})
  .addDataModelBinding(CG.common('IDataModelBindingsSimple').optional({ onlyIn: Variant.Internal }))
  .addTextResource(
    new CG.trb({
      name: 'title',
      title: 'Title',
      description: 'Title of the Likert component/row',
    }),
  )
  // TODO: description/help only works on mobile, as it uses the ControlledRadioGroup component
  // Ideally, it should be possible to use it on desktop as well, or the mobile mode should also not display
  // anything here. Fixing this requires some refactoring.
  .addTextResource(
    new CG.trb({
      name: 'description',
      title: 'Description',
      description: 'Description of the Likert component/row (only shown on mobile)',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'help',
      title: 'Help',
      description: 'Help text of the Likert component/row (only shown on mobile)',
    }),
  )
  .makeSelectionComponent()
  .addProperty(new CG.prop('layout', CG.common('LayoutStyle').optional()))
  .addProperty(
    new CG.prop('showAsCard', new CG.bool().optional()).onlyIn(
      // TODO: This should probably not be available on the Likert component (if it should, only on mobile?)
      // Marking it as internal only for now, in case it is needed for some reason.
      Variant.Internal,
    ),
  );
