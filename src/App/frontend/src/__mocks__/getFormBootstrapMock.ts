import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import type { FormBootstrapResponse, RawDataModelInfo } from 'src/features/formBootstrap/types';

export function getDataModelBootstrapMock(
  overrides: Partial<RawDataModelInfo> | ((obj: RawDataModelInfo) => void) = {},
): RawDataModelInfo {
  const out = {
    schema: {
      type: 'object',
      properties: {},
    },
    initialData: {},
    dataElementId: defaultMockDataElementId,
    isWritable: true,
    expressionValidationConfig: null,
  } satisfies RawDataModelInfo;

  if (typeof overrides === 'function') {
    overrides(out);
  } else if (overrides) {
    Object.assign(out, overrides);
  }

  return out;
}

export function getFormBootstrapMock(
  overrides: Partial<FormBootstrapResponse> | ((obj: FormBootstrapResponse) => void) = {},
): FormBootstrapResponse {
  const out = {
    layouts: {
      FormLayout: {
        data: {
          layout: [],
        },
      },
    },
    dataModels: {
      [defaultDataTypeMock]: getDataModelBootstrapMock(),
    },
    staticOptions: {},
    validationIssues: null,
  } satisfies FormBootstrapResponse;

  if (typeof overrides === 'function') {
    overrides(out);
  } else if (overrides && Object.keys(overrides).length > 0) {
    Object.assign(out, overrides);
  }

  return out;
}
