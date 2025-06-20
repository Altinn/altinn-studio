import React from 'react';

import { jest } from '@jest/globals';
import fs from 'node:fs';

import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { ExpressionValidation } from 'src/features/validation/expressionValidation/ExpressionValidation';
import { Validation } from 'src/features/validation/validationContext';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import * as NodesContext from 'src/utils/layout/NodesContext';
import type { IRawTextResource } from 'src/features/language/textResources';
import type { FieldValidations, IExpressionValidationConfig } from 'src/features/validation';
import type { ILayoutCollection } from 'src/layout/layout';

interface SimpleValidation {
  message: string;
  severity: string;
  field: string;
}

type ExpressionValidationTest = {
  name: string;
  expects: SimpleValidation[];
  validationConfig: IExpressionValidationConfig;
  formData: object;
  layouts: ILayoutCollection;
  textResources: IRawTextResource[];
};

function sortValidations(validations: SimpleValidation[]) {
  // Sort by message, then by severity, then by field
  return validations.sort((a, b) => {
    if (a.message && b.message && a.message < b.message) {
      return -1;
    }
    if (a.message && b.message && a.message > b.message) {
      return 1;
    }
    if (a.severity < b.severity) {
      return -1;
    }
    if (a.severity > b.severity) {
      return 1;
    }
    if (a.field < b.field) {
      return -1;
    }
    if (a.field > b.field) {
      return 1;
    }
    return 0;
  });
}

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
    jest.spyOn(DataModels, 'useExpressionValidationConfig').mockRestore();
    jest.spyOn(NodesContext, 'useNodes').mockRestore();
    jest.spyOn(Validation, 'useUpdateDataModelValidations').mockRestore();
  });

  const sharedTests = getSharedTests();
  it.each(sharedTests)('$name', async ({ name: _, expects, validationConfig, formData, textResources, layouts }) => {
    // Mock updateDataModelValidations
    let result: FieldValidations = {};
    const updateDataModelValidations = jest.fn((_key, _dataType, validations: FieldValidations) => {
      result = validations;
    });
    jest.spyOn(Validation, 'useUpdateDataModelValidations').mockImplementation(() => updateDataModelValidations);

    await renderWithInstanceAndLayout({
      renderer: () => <ExpressionValidation />,
      queries: {
        fetchLayouts: async () => layouts,
        fetchCustomValidationConfig: async () => validationConfig,
        fetchFormData: async () => formData,
        fetchTextResources: async (language) => ({
          language,
          resources: textResources ?? [],
        }),
      },
    });

    expect(updateDataModelValidations).toHaveBeenCalledWith(
      'expression',
      defaultMockDataElementId,
      expect.objectContaining({}),
    );

    // Format results in a way that makes it easier to compare
    const validations = JSON.stringify(
      sortValidations(
        Object.entries(result).flatMap(([field, V]) =>
          V.map(({ message, severity }) => ({
            message: message.key!,
            severity,
            field,
          })),
        ) satisfies SimpleValidation[],
      ),
      null,
      2,
    );

    const expectedValidations = JSON.stringify(
      sortValidations(expects.map(({ message, severity, field }) => ({ message, severity, field }))),
      null,
      2,
    );

    expect(validations).toEqual(expectedValidations);
  });
});
