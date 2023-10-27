import { CG, Variant } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  rendersWithLabel: true,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
})
  .makeSelectionComponent()
  .addDataModelBinding(CG.common('IDataModelBindingsSimple').optional({ onlyIn: Variant.Internal }))
  .addProperty(
    new CG.prop(
      'sortOrder',
      new CG.enum('asc', 'desc')
        .setDescription('Sorts the code list in either ascending or descending order by label.')
        .optional(),
    ),
  );
