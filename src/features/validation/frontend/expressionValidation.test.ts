import fs from 'node:fs';

import { getHierarchyDataSourcesMock } from 'src/__mocks__/getHierarchyDataSourcesMock';
import { convertLayouts } from 'src/features/expressions/shared';
import { staticUseLanguageForTests } from 'src/features/language/useLanguage';
import {
  resolveExpressionValidationConfig,
  runExpressionValidationsOnNode,
} from 'src/features/validation/frontend/expressionValidation';
import { buildAuthContext } from 'src/utils/authContext';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import { _private } from 'src/utils/layout/hierarchy';
import type { Layouts } from 'src/features/expressions/shared';
import type { IExpressionValidationConfig, ValidationDataSources } from 'src/features/validation';
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
      formData,
      instanceDataSources: buildInstanceDataSources(),
      authContext: buildAuthContext(undefined),
      hiddenFields,
      langToolsRef: { current: langTools },
    };

    const customValidation = resolveExpressionValidationConfig(validationConfig);

    const validationContext = {
      customValidation,
    } as ValidationDataSources;

    const _layouts = convertLayouts(layouts);
    const rootCollection = resolvedNodesInLayouts(_layouts, '', dataSources);
    const nodes = rootCollection.allNodes();
    const validations = nodes.flatMap((node) => runExpressionValidationsOnNode(node, validationContext));
    // Format results in a way that makes it easier to compare

    const result = JSON.stringify(
      Object.values(validations).map(({ message, severity, field }) => ({
        message: message.key,
        severity,
        field,
      })),
      null,
      2,
    );

    const expectedResult = JSON.stringify(
      expects.map(({ message, severity, field }) => ({ message, severity, field })),
      null,
      2,
    );

    expect(result).toEqual(expectedResult);
  });
});
