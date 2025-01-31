import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getSubFormLayoutSetMock } from 'src/__mocks__/getLayoutSetsMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { getSharedTests, type SharedTestFunctionContext } from 'src/features/expressions/shared';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { useCurrentPartyRoles } from 'src/features/useCurrentPartyRoles';
import { fetchApplicationMetadata, fetchProcessState } from 'src/queries/queries';
import { renderWithNode } from 'src/test/renderWithProviders';
import { useEvalExpression } from 'src/utils/layout/generator/useEvalExpression';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { ExprPositionalArgs, ExprValToActualOrExpr, ExprValueArgs } from 'src/features/expressions/types';
import type { ExternalApisResult } from 'src/features/externalApi/useExternalApi';
import type { RoleResult } from 'src/features/useCurrentPartyRoles';
import type { ILayoutCollection } from 'src/layout/layout';
import type { IData, IDataType } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

jest.mock('src/features/externalApi/useExternalApi');
jest.mock('src/features/useCurrentPartyRoles');

interface Props {
  node: LayoutNode;
  expression: ExprValToActualOrExpr<ExprVal.Any>;
  positionalArguments?: ExprPositionalArgs;
  valueArguments?: ExprValueArgs;
}

function ExpressionRunner({ node, expression, positionalArguments, valueArguments }: Props) {
  const dataSources = useExpressionDataSources();
  const result = useEvalExpression(ExprVal.Any, node, expression, null, dataSources, {
    positionalArguments,
    valueArguments,
  });
  return <div data-testid='expr-result'>{JSON.stringify(result)}</div>;
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
              simpleBinding: { dataType: 'default', field: 'mockField' },
            },
          },
        ],
      },
    },
  };
}

describe('Expressions shared function tests', () => {
  beforeAll(() => {
    jest
      .spyOn(window, 'logError')
      .mockImplementation(() => {})
      .mockName('window.logError');
    jest
      .spyOn(window, 'logErrorOnce')
      .mockImplementation(() => {})
      .mockName('window.logErrorOnce');
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
        layouts: _layouts,
        dataModel,
        dataModels,
        instanceDataElements,
        instance: _instance,
        process: _process,
        permissions,
        frontendSettings,
        textResources,
        profileSettings,
        externalApis,
        positionalArguments,
        valueArguments,
        roles,
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
        instance ? {} : { onEntry: { show: 'layout-set' }, externalApiIds: ['testId'] },
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
      if (dataModels) {
        applicationMetadata.dataTypes.push(
          ...(dataModels.map((dm) => ({
            id: dm.dataElement.dataType,
            appLogic: { classRef: 'some-class' },
            taskId: 'Task_1',
          })) as IDataType[]),
        );
      }
      if (!applicationMetadata.dataTypes.find((d) => d.id === 'default')) {
        applicationMetadata.dataTypes.push({
          id: 'default',
          appLogic: { classRef: 'some-class', taskId: 'Task_1' },
        } as unknown as IDataType);
      }

      let layouts: ILayoutCollection | undefined;
      if (_layouts) {
        // Frontend will look inside the layout for data model bindings and expressions in order to figure out which
        // data models to load. Since the expression we're testing is not part of the layout, we need to add it here
        // so that everything is loaded correctly.
        layouts = structuredClone(_layouts);
        const firstPage = Object.values(layouts)[0];
        firstPage?.data.layout.push({
          id: 'theCurrentExpression',
          type: 'NavigationButtons',
          ...({
            // This makes sure that the expression is never evaluated, as it is not a valid property. All properties
            // that can handle expressions (like 'hidden') will be evaluated during hierarchy generation, but errors
            // from there (such as unknown extra properties like this one) will not cause test failures here (so doing
            // this is safe). DataModelsProvider however, will recursively look inside the layout and find anything
            // that resembles an expression and load the data model it refers to. In other words, this makes sure we
            // load any data models that are only references in the expression we're testing - not elsewhere in the
            // layout. For an example of a test that would fail without this, see 'dataModel-non-default-model.json'.
            // It has only a Paragraph component with no expressions in it, so without injecting the tested
            // expression into that layout, DataModelsProvider would not load the data model that the expression refers
            // to, and the test would fail.
            notAnActualExpression: expression,
          } as object),
        });
      }

      const profile = getProfileMock();
      if (profileSettings?.language) {
        profile.profileSettingPreference.language = profileSettings.language;
      }

      async function fetchFormData(url: string) {
        if (!dataModels) {
          return dataModel ?? {};
        }

        const statelessDataType = url.match(/dataType=([\w-]+)&/)?.[1];
        const statefulDataElementId = url.match(/data\/([a-f0-9-]+)\?/)?.[1];

        const model = dataModels.find(
          (dm) => dm.dataElement.dataType === statelessDataType || dm.dataElement.id === statefulDataElementId,
        );
        if (model) {
          return model.data;
        }
        throw new Error(`Datamodel ${url} not found in ${JSON.stringify(dataModels)}`);
      }

      async function fetchInstanceData() {
        let instanceData = getInstanceDataMock();
        if (instance) {
          instanceData = { ...instanceData, ...instance };
        }
        if (instanceDataElements) {
          instanceData.data.push(...instanceDataElements);
        }
        if (dataModels) {
          instanceData.data.push(...dataModels.map((dm) => dm.dataElement));
        }
        if (!instanceData.data.find((d) => d.dataType === 'default')) {
          instanceData.data.push({ id: 'abc', dataType: 'default' } as IData);
        }
        return instanceData;
      }

      // Clear localstorage, because LanguageProvider uses it to cache selected languages
      localStorage.clear();

      jest.mocked(fetchApplicationMetadata).mockResolvedValue(applicationMetadata);
      jest.mocked(useExternalApis).mockReturnValue(externalApis as ExternalApisResult);
      jest.mocked(fetchProcessState).mockImplementation(async () => process ?? getProcessDataMock());
      jest.mocked(useCurrentPartyRoles).mockReturnValue(roles as RoleResult);

      const nodeId = nodeIdFromContext(context);
      await renderWithNode({
        nodeId,
        renderer: ({ node }) => (
          <ExpressionRunner
            node={node}
            expression={expression}
            positionalArguments={positionalArguments}
            valueArguments={valueArguments}
          />
        ),
        inInstance: !!instance || !!dataModels,
        queries: {
          fetchLayoutSets: async () => ({
            sets: [{ id: 'layout-set', dataType: 'default', tasks: ['Task_1'] }, getSubFormLayoutSetMock()],
          }),
          fetchLayouts: async () => layouts ?? getDefaultLayouts(),
          fetchFormData,
          fetchInstanceData,
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
        expect(errorMock).toHaveBeenCalledTimes(1);
      } else {
        expect(errorMock).not.toHaveBeenCalled();
        ExprValidation.throwIfInvalid(expression);
        expect(result).toEqual(expects);
      }
    });
  });
});
