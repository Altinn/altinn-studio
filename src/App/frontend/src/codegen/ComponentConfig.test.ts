import { CompCategory } from '@app/layout-contract';
import { describe, expect, it } from 'vitest';

import { CG } from 'src/codegen/CG';
import { CodeGeneratorContext } from 'src/codegen/CodeGeneratorContext';

function createComponent(category: CompCategory) {
  return new CG.component({
    category,
    availability: 'configurable',
    metadata: { name: { en: 'Example', nb: 'Eksempel' } },
    capabilities: {
      renderInTable: false,
      renderInButtonGroup: false,
      renderInAccordion: false,
      renderInAccordionGroup: false,
      renderInTabs: false,
      renderInCards: false,
      renderInCardsMedia: false,
    },
  })
    .setType('Example')
    .makeSummarizable();
}

describe('summary override generation', () => {
  it.each([
    { category: CompCategory.Form, editable: true },
    { category: CompCategory.Container, editable: false },
    { category: CompCategory.Presentation, editable: false },
  ])('derives Next-button support for a new $category component', async ({ category, editable }) => {
    const component = createComponent(category).addSummaryOverrides();
    const { result } = await CodeGeneratorContext.generateTypeScript('example.generated.ts', () =>
      component.generateConfigTypes(),
    );

    expect(result.includes('showNextButton?: boolean;')).toBe(editable);
    expect(result).toContain(
      editable ? 'summaryOverrides: ExampleSummaryOverrides;' : 'summaryOverrides: ISummaryOverridesCommon;',
    );
  });

  it('uses bindings added after override registration and preserves component-specific settings', async () => {
    const component = createComponent(CompCategory.Container)
      .addSummaryOverrides((overrides) => {
        overrides.addProperty(new CG.prop('display', new CG.enum('table', 'list').optional()));
      })
      .addDataModelBinding(CG.common('IDataModelBindingsList'));
    const { result } = await CodeGeneratorContext.generateTypeScript('example.generated.ts', () =>
      component.generateConfigTypes(),
    );

    expect(result).toContain('showNextButton?: boolean;');
    expect(result).toContain('display?: "table" | "list";');
    expect(result).toContain('summaryOverrides: ExampleSummaryOverrides;');
  });

  it('keeps summary overrides disabled when a component does not register them', async () => {
    const component = createComponent(CompCategory.Form);
    const { result } = await CodeGeneratorContext.generateTypeScript('example.generated.ts', () =>
      component.generateConfigTypes(),
    );

    expect(result).not.toContain('showNextButton');
    expect(result).toContain('summaryOverrides: undefined;');
  });
});
