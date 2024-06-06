import { renderHook } from '@testing-library/react';
import dot from 'dot-object';
import fs from 'node:fs';

import { getHierarchyDataSourcesMock } from 'src/__mocks__/getHierarchyDataSourcesMock';
import * as CustomValidationContext from 'src/features/customValidation/CustomValidationContext';
import { resolveExpressionValidationConfig } from 'src/features/customValidation/customValidationUtils';
import { convertLayouts } from 'src/features/expressions/shared';
import { FD } from 'src/features/formData/FormDataWrite';
import { staticUseLanguageForTests } from 'src/features/language/useLanguage';
import { useExpressionValidation } from 'src/features/validation/expressionValidation/useExpressionValidation';
import { buildAuthContext } from 'src/utils/authContext';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import { _private } from 'src/utils/layout/hierarchy';
import * as NodesContext from 'src/utils/layout/NodesContext';
import type { Layouts } from 'src/features/expressions/shared';
import type { IExpressionValidationConfig } from 'src/features/validation';
import type { HierarchyDataSources } from 'src/layout/layout';
const { resolvedNodesInLayouts } = _private;

type ExpressionValidationTest = {
  name: string;
  expects: {
    message: string;
    severity: string;
    field: string;
    componentId: string;
  }[];
  validationConfig: IExpressionValidationConfig;
  formData: object;
  layouts: Layouts;
};

function getSharedTests() {
  const fullPath = `${__dirname}/shared-expression-validation-tests`;
  const out: ExpressionValidationTest[] = [];
  fs.readdirSync(fullPath).forEach((name) => {
    if (name.endsWith('.json')) {
      const testJson = fs.readFileSync(`${fullPath}/${name}`);
      const test = JSON.parse(testJson.toString());
      test.name += ` (${name})`;
      out.push(test);
    }
  });

  return out;
}

describe('Expression validation shared tests', () => {
  beforeEach(() => {
    jest.spyOn(FD, 'useDebounced').mockRestore();
    jest.spyOn(CustomValidationContext, 'useCustomValidationConfig').mockRestore();
    jest.spyOn(NodesContext, 'useNodes').mockRestore();
  });

  const sharedTests = getSharedTests();
  it.each(sharedTests)('$name', ({ name: _, expects, validationConfig, formData, layouts }) => {
    const langTools = staticUseLanguageForTests();

    const hiddenFields = new Set<string>(
      Object.values(layouts)
        .filter((l) => l.data.hidden)
        .flatMap((l) => l.data.layout)
        .map((c) => c.id),
    );

    const dataSources: HierarchyDataSources = {
      ...getHierarchyDataSourcesMock(),
      formDataSelector: (path) => dot.pick(path, formData),
      instanceDataSources: buildInstanceDataSources(),
      authContext: buildAuthContext(undefined),
      isHidden: (nodeId: string) => hiddenFields.has(nodeId),
      langToolsSelector: () => langTools,
    };

    const customValidation = resolveExpressionValidationConfig(validationConfig);

    const _layouts = convertLayouts(layouts);
    const rootCollection = resolvedNodesInLayouts(_layouts, '', dataSources);

    jest.spyOn(FD, 'useDebounced').mockReturnValue(formData);
    jest.spyOn(CustomValidationContext, 'useCustomValidationConfig').mockReturnValue(customValidation);
    jest.spyOn(NodesContext, 'useNodes').mockReturnValue(rootCollection);

    const { result } = renderHook(() => useExpressionValidation());
    // Format results in a way that makes it easier to compare

    const validations = JSON.stringify(
      Object.entries(result.current).flatMap(([field, V]) =>
        V.map(({ message, severity }) => ({
          message: message.key,
          severity,
          field,
        })),
      ),
      null,
      2,
    );

    const expectedValidations = JSON.stringify(
      expects.map(({ message, severity, field }) => ({ message, severity, field })),
      null,
      2,
    );

    expect(validations).toEqual(expectedValidations);
  });
});
