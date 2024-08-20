import React from 'react';

import { screen } from '@testing-library/react';
import fs from 'node:fs';

import * as CustomValidationContext from 'src/features/customValidation/CustomValidationContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useExpressionValidation } from 'src/features/validation/expressionValidation/useExpressionValidation';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import * as NodesContext from 'src/utils/layout/NodesContext';
import type { IExpressionValidationConfig } from 'src/features/validation';
import type { ILayoutCollection } from 'src/layout/layout';

interface SimpleValidation {
  message: string | undefined;
  severity: string;
  field: string;
}

type ExpressionValidationTest = {
  name: string;
  expects: SimpleValidation[];
  validationConfig: IExpressionValidationConfig;
  formData: object;
  layouts: ILayoutCollection;
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

function ExprValidationTester() {
  const result = useExpressionValidation();

  // Format results in a way that makes it easier to compare
  const validationsArray: SimpleValidation[] = Object.entries(result).flatMap(([field, V]) =>
    V.map(({ message, severity }) => ({
      message: message.key,
      severity,
      field,
    })),
  );
  const validations = JSON.stringify(sortValidations(validationsArray), null, 2);

  return <div data-testid='validations'>{validations}</div>;
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
    jest.spyOn(CustomValidationContext, 'useCustomValidationConfig').mockRestore();
    jest.spyOn(NodesContext, 'useNodes').mockRestore();
  });

  const sharedTests = getSharedTests();
  it.each(sharedTests)('$name', async ({ name: _, expects, validationConfig, formData, layouts }) => {
    await renderWithInstanceAndLayout({
      renderer: () => <ExprValidationTester />,
      queries: {
        fetchLayouts: async () => layouts,
        fetchCustomValidationConfig: async () => validationConfig,
        fetchFormData: async () => formData,
      },
    });

    const expectedValidations = sortValidations(
      expects.map(({ message, severity, field }) => ({ message, severity, field })),
    );
    const validations = JSON.parse(screen.getByTestId('validations').textContent!);
    expect(validations).toEqual(expectedValidations);
  });
});
