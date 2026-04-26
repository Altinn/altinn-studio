import React, { useEffect } from 'react';

import { waitFor } from '@testing-library/react';
import fs from 'node:fs';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { Form } from 'src/components/form/Form';
import { FormStore } from 'src/features/form/FormContext';
import { FrontendValidationSource } from 'src/features/validation';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IRawTextResource } from 'src/features/language/textResources';
import type { IExpressionValidationConfig } from 'src/features/validation';
import type { ILayoutCollection } from 'src/layout/layout';

interface SimpleValidation {
  message: string;
  severity: string;
  field: string;
  componentId?: string;
}

type ExpressionValidationTest = {
  name: string;
  expects: SimpleValidation[];
  validationConfig: IExpressionValidationConfig;
  formData: object;
  layouts: ILayoutCollection;
  textResources: IRawTextResource[];
};

function ValidationSnapshot({ onSnapshot }: { onSnapshot: (validations: SimpleValidation[]) => void }) {
  const validations = FormStore.raw.useMemoSelector((state) =>
    Object.entries(state.nodes.nodeData).flatMap(([componentId, nodeData]) => {
      if (!('validations' in nodeData)) {
        return [];
      }

      return nodeData.validations.flatMap((validation) => {
        if (
          validation.source !== FrontendValidationSource.Expression ||
          !('field' in validation) ||
          typeof validation.field !== 'string'
        ) {
          return [];
        }

        return {
          message: validation.message.key ?? '',
          severity: validation.severity,
          field: validation.field,
          componentId,
        } satisfies SimpleValidation;
      });
    }),
  );

  useEffect(() => {
    onSnapshot(validations);
  }, [onSnapshot, validations]);

  return null;
}

function sortValidations(validations: SimpleValidation[]) {
  return validations.sort((a, b) => {
    if (a.message < b.message) {
      return -1;
    }
    if (a.message > b.message) {
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
    if ((a.componentId ?? '') < (b.componentId ?? '')) {
      return -1;
    }
    if ((a.componentId ?? '') > (b.componentId ?? '')) {
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
    window.altinnAppGlobalData.ui = getUiConfigMock();
  });

  const sharedTests = getSharedTests();
  it.each(sharedTests)('$name', async ({ name: _, expects, validationConfig, formData, textResources, layouts }) => {
    let result: SimpleValidation[] = [];
    window.altinnAppGlobalData.textResources!.resources = [
      ...(textResources ?? []),
      ...Object.keys(layouts).map((pageKey) => ({ id: pageKey, value: pageKey })),
    ];
    window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
      ui.folders.Task_1 = {
        defaultDataType: defaultDataTypeMock,
        pages: { order: Object.keys(layouts) },
      };
    });

    await renderWithInstanceAndLayout({
      renderer: () => (
        <>
          <Form />
          <ValidationSnapshot onSnapshot={(validations) => (result = validations)} />
        </>
      ),
      initialPage: Object.keys(layouts)[0],
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.layouts = layouts;
            obj.dataModels[defaultDataTypeMock].expressionValidationConfig = validationConfig;
            obj.dataModels[defaultDataTypeMock].initialData = formData;
          }),
      },
    });

    await waitFor(() => {
      const includeComponentId = expects.some((validation) => validation.componentId);
      const normalize = (validations: SimpleValidation[]) =>
        validations.map(({ message, severity, field, componentId }) =>
          includeComponentId ? { message, severity, field, componentId } : { message, severity, field },
        );
      const validations = JSON.stringify(sortValidations(normalize([...result])), null, 2);
      const expectedValidations = JSON.stringify(sortValidations(normalize([...expects])), null, 2);
      expect(validations).toEqual(expectedValidations);
    });
  });
});
