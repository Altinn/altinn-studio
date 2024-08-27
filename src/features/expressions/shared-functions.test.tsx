import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { getSharedTests } from 'src/features/expressions/shared';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderWithNode } from 'src/test/renderWithProviders';
import { useEvalExpression } from 'src/utils/layout/generator/useEvalExpression';
import type { SharedTestFunctionContext } from 'src/features/expressions/shared';
import type { ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { ExternalApisResult } from 'src/features/externalApi/useExternalApi';
import type { ILayoutCollection } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

jest.mock('src/features/externalApi/useExternalApi');

function ExpressionRunner({ node, expression }: { node: LayoutNode; expression: ExprValToActualOrExpr<ExprVal.Any> }) {
  const result = useEvalExpression(ExprVal.Any, node, expression, null);
  return (
    <>
      <div data-testid='expr-result'>{JSON.stringify(result)}</div>
    </>
  );
}

function nodeIdFromContext(context: SharedTestFunctionContext | undefined) {
  if (!context?.component) {
    return 'default';
  }
  if (context.rowIndices) {
    return `${context.component}-${context.rowIndices.join('-')}`;
  }
  return context.component;
}

function getDefaultLayouts(): ILayoutCollection {
  return {
    default: {
      data: {
        layout: [
          {
            id: 'default',
            type: 'Input',
            dataModelBindings: {
              simpleBinding: 'mockField',
            },
          },
        ],
      },
    },
  };
}

describe('Expressions shared function tests', () => {
  beforeAll(() => {
    jest.spyOn(window, 'logError').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const sharedTests = getSharedTests('functions');

  describe.each(sharedTests.content)('Function: $folderName', (folder) => {
    it.each(folder.content)('$name', async (test) => {
      const {
        disabledFrontend,
        expression,
        expects,
        expectsFailure,
        context,
        layouts,
        dataModel,
        instanceDataElements,
        instance: _instance,
        process: _process,
        permissions,
        frontendSettings,
        textResources,
        profileSettings,
        externalApis,
      } = test;

      if (disabledFrontend) {
        // Skipped tests usually means that the frontend does not support the feature yet
        return;
      }

      const hasInstance = Boolean(_instance || instanceDataElements || _process || permissions);

      const instance =
        _instance && instanceDataElements
          ? { ..._instance, data: [..._instance.data, ...instanceDataElements] }
          : !_instance && instanceDataElements
            ? getInstanceDataMock((i) => {
                i.data = [...i.data, ...instanceDataElements];
              })
            : hasInstance
              ? getInstanceDataMock((i) => {
                  for (const key of Object.keys(_instance || {})) {
                    i[key] = _instance![key];
                  }
                })
              : undefined;

      const process = _process
        ? _process
        : permissions
          ? getProcessDataMock((p) => {
              for (const key of Object.keys(permissions)) {
                p.currentTask![key] = permissions[key];
              }
            })
          : hasInstance
            ? getProcessDataMock()
            : undefined;

      const applicationMetadata = getIncomingApplicationMetadataMock(
        instance ? {} : { onEntry: { show: 'stateless' }, externalApiIds: ['testId'] },
      );
      if (instanceDataElements) {
        for (const element of instanceDataElements) {
          if (!applicationMetadata.dataTypes!.find((dt) => dt.id === element.dataType)) {
            applicationMetadata.dataTypes!.push({
              id: element.dataType,
              allowedContentTypes: null,
              minCount: 0,
              maxCount: 5,
            });
          }
        }
      }

      const profile = getProfileMock();
      if (profileSettings?.language) {
        profile.profileSettingPreference.language = profileSettings.language;
      }

      // Clear localstorage, because LanguageProvider uses it to cache selected languages
      localStorage.clear();

      (fetchApplicationMetadata as jest.Mock<typeof fetchApplicationMetadata>).mockResolvedValue(applicationMetadata);
      (useExternalApis as jest.Mock<typeof useExternalApis>).mockReturnValue(externalApis as ExternalApisResult);

      const nodeId = nodeIdFromContext(context);
      await renderWithNode({
        nodeId,
        renderer: ({ node }) => (
          <ExpressionRunner
            node={node}
            expression={expression}
          />
        ),
        inInstance: !!instance,
        queries: {
          fetchLayouts: async () => layouts ?? getDefaultLayouts(),
          fetchFormData: async () => dataModel ?? {},
          ...(instance ? { fetchInstanceData: async () => instance } : {}),
          ...(process ? { fetchProcessState: async () => process } : {}),
          ...(frontendSettings ? { fetchApplicationSettings: async () => frontendSettings } : {}),
          fetchUserProfile: async () => profile,
          fetchTextResources: async () => ({
            language: 'nb',
            resources: textResources || [],
          }),
        },
      });

      const errorMock = window.logError as jest.Mock;
      const textContent = (await screen.findByTestId('expr-result')).textContent;
      const result = textContent ? JSON.parse(textContent) : null;

      if (expectsFailure) {
        expect(errorMock).toHaveBeenCalledWith(expect.stringContaining(expectsFailure));
      } else {
        expect(errorMock).not.toHaveBeenCalled();
        ExprValidation.throwIfInvalid(expression);
        expect(result).toEqual(expects);
      }
    });
  });
});
