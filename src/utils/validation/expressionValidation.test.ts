import dot from 'dot-object';
import fs from 'node:fs';

import { getHierarchyDataSourcesMock } from 'src/__mocks__/hierarchyMock';
import { convertLayouts, type Layouts } from 'src/features/expressions/shared';
import { staticUseLanguageForTests } from 'src/hooks/useLanguage';
import { buildAuthContext } from 'src/utils/authContext';
import { getRepeatingGroups } from 'src/utils/formLayout';
import { buildInstanceContext } from 'src/utils/instanceContext';
import { _private } from 'src/utils/layout/hierarchy';
import { resolveExpressionValidationConfig } from 'src/utils/validation/expressionValidation';
import { runValidationOnNodes } from 'src/utils/validation/validation';
import type { HierarchyDataSources } from 'src/layout/layout';
import type { IRepeatingGroups } from 'src/types';
import type {
  IExpressionValidationConfig,
  IValidationMessage,
  ValidationContextGenerator,
  ValidationSeverity,
} from 'src/utils/validation/types';
import type { IValidationOptions } from 'src/utils/validation/validation';

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
      formData: dot.dot(formData),
      instanceContext: buildInstanceContext(),
      authContext: buildAuthContext(undefined),
      hiddenFields,
      langTools,
    };

    const customValidation = resolveExpressionValidationConfig(validationConfig);

    const ctxGenerator = (() => ({
      customValidation,
      langTools,
    })) as unknown as ValidationContextGenerator;

    const _layouts = convertLayouts(layouts);
    let repeatingGroups: IRepeatingGroups = {};
    for (const key of Object.keys(_layouts)) {
      repeatingGroups = {
        ...repeatingGroups,
        ...getRepeatingGroups(_layouts[key] || [], dataSources.formData),
      };
    }

    const rootCollection = resolvedNodesInLayouts(_layouts, '', repeatingGroups, dataSources);
    const nodes = rootCollection.allNodes();
    const options: IValidationOptions = {
      skipComponentValidation: true,
      skipEmptyFieldValidation: true,
      skipSchemaValidation: true,
    };
    const validationObjects = runValidationOnNodes(nodes, ctxGenerator, options).filter(
      (o) => !o.empty,
    ) as IValidationMessage<ValidationSeverity>[];

    // Format results in a way that makes it easier to compare

    const result = JSON.stringify(
      validationObjects.map(({ message, severity, componentId }) => ({ message, severity, componentId })),
      null,
      2,
    );

    const expectedResult = JSON.stringify(
      expects.map(({ message, severity, componentId }) => ({ message, severity, componentId })),
      null,
      2,
    );

    expect(result).toEqual(expectedResult);
  });
});
