import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';
import type { AxiosResponse } from 'axios';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import { getSharedTests } from 'src/features/expressions/shared';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import {
  getRepeatingBinding,
  isRepeatingComponent,
  RepeatingComponents,
} from 'src/features/form/layout/utils/repeating';
import { fetchInstanceData, fetchProcessState } from 'src/queries/queries';
import { AppQueries } from 'src/queries/types';
import {
  renderWithInstanceAndLayout,
  renderWithoutInstanceAndLayout,
  StatelessRouter,
} from 'src/test/renderWithProviders';
import { NestedDataModelLocationProviders } from 'src/utils/layout/DataModelLocation';
import { useEvalExpression } from 'src/utils/layout/generator/useEvalExpression';
import type { FunctionTest, FunctionTestBase, SharedTestFunctionContext } from 'src/features/expressions/shared';
import type { ExprPositionalArgs, ExprValToActualOrExpr, ExprValueArgs } from 'src/features/expressions/types';
import type { ExternalApisResult } from 'src/features/externalApi/useExternalApi';
import type { IRawOption } from 'src/layout/common.generated';
import type { IDataModelBindings, ILayoutCollection } from 'src/layout/layout';
import type { IData, IDataType, IInstance, IProcess, IProfile } from 'src/types/shared';

jest.mock('src/features/externalApi/useExternalApi');

interface Props {
  context: SharedTestFunctionContext | undefined;
  expression: ExprValToActualOrExpr<ExprVal.Any>;
  positionalArguments?: ExprPositionalArgs;
  valueArguments?: ExprValueArgs;
}

function InnerExpressionRunner({ expression, positionalArguments, valueArguments }: Props) {
  const result = useEvalExpression(expression, {
    returnType: ExprVal.Any,
    defaultValue: null,
    positionalArguments,
    valueArguments,
  });
  return <div data-testid='expr-result'>{JSON.stringify(result)}</div>;
}

function ExpressionRunner(props: Props) {
  const layoutLookups = useLayoutLookups();
  if (props.context === undefined || props.context.rowIndices === undefined || props.context.rowIndices.length === 0) {
    return <InnerExpressionRunner {...props} />;
  }

  const parentIds: string[] = [];
  let currentParent = layoutLookups.componentToParent[props.context.component];
  while (currentParent && currentParent.type === 'node') {
    const parentComponent = layoutLookups.getComponent(currentParent.id);
    if (isRepeatingComponent(parentComponent)) {
      parentIds.push(parentComponent.id);
    }
    currentParent = layoutLookups.componentToParent[currentParent.id];
  }

  if (parentIds.length !== props.context.rowIndices.length) {
    throw new Error(
      `Component '${props.context.component}' has ${parentIds.length} repeating parent components, ` +
        `but rowIndices contains ${props.context.rowIndices.length} indices.`,
    );
  }

  const fieldSegments: string[] = [];
  for (let level = 0; level < parentIds.length; level++) {
    const parentId = parentIds[parentIds.length - 1 - level]; // Get outermost parent first
    const rowIndex = props.context.rowIndices[level];
    const component = layoutLookups.getComponent(parentId);
    const bindings = component.dataModelBindings as IDataModelBindings<RepeatingComponents>;
    const groupBinding = getRepeatingBinding(component.type as RepeatingComponents, bindings);
    if (!groupBinding) {
      throw new Error(`No group binding found for ${parentId}`);
    }

    const currentPath = fieldSegments.join('.');
    let segmentName = groupBinding.field;
    if (currentPath) {
      const currentFieldPath = currentPath.replace(/\[\d+]/g, ''); // Remove all [index] parts
      if (segmentName.startsWith(`${currentFieldPath}.`)) {
        segmentName = segmentName.substring(currentFieldPath.length + 1);
      }
    }

    fieldSegments.push(`${segmentName}[${rowIndex}]`);
  }

  return (
    <NestedDataModelLocationProviders
      reference={{
        dataType: 'default',
        field: fieldSegments.join('.'),
      }}
    >
      <InnerExpressionRunner {...props} />
    </NestedDataModelLocationProviders>
  );
}

const defaultLanguage = 'nb';

describe('Expressions shared function tests', () => {
  beforeAll(() => {
    jest
      .spyOn(window, 'logError')
      .mockImplementation(() => {})
      .mockName('window.logError');
    jest
      .spyOn(window, 'logWarnOnce')
      .mockImplementation(() => {})
      .mockName('window.logWarnOnce');
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

  const sharedTests = getSharedTests('functions').content;

  describe.each(sharedTests)('Function: $folderName', (folder) => {
    describe.each(folder.content)('$name', (test) => {
      if (test.disabledFrontend) {
        return;
      }

      it.each(getAllTestCases(test))('$expression', async (testCase) => {
        clearGlobals();
        setupMocks(test);
        await renderExpression(test, testCase.expression);
        await assertExpr(testCase);
      });
    });
  });
});

function getAllTestCases(test: FunctionTest): FunctionTestBase[] {
  const mainCase = extractMainTestCase(test);
  const subordinateCases: FunctionTestBase[] = test.testCases ?? [];
  return mainCase ? [mainCase, ...subordinateCases] : subordinateCases;
}

function extractMainTestCase({ expression, expects, expectsFailure }: FunctionTest): FunctionTestBase | null {
  return expression === undefined ? null : { expression, expects, expectsFailure };
}

function clearGlobals(): void {
  // Clear localstorage, because LanguageProvider uses it to cache selected languages
  localStorage.clear();
}

function setupMocks(test: FunctionTest): void {
  const { profileSettings, layouts, externalApis, textResources } = test;

  window.altinnAppGlobalData.frontendSettings = test.frontendSettings ?? {};
  window.altinnAppGlobalData.applicationMetadata = createApplicationMetadata(test);
  window.altinnAppGlobalData.userProfile = createProfile(profileSettings);
  window.altinnAppGlobalData.textResources!.resources = textResources ?? [];
  window.altinnAppGlobalData.textResources!.language = profileSettings?.language ?? defaultLanguage;
  window.altinnAppGlobalData.availableLanguages = [{ language: profileSettings?.language ?? defaultLanguage }];
  window.altinnAppGlobalData.ui.folders = {
    Task_1: { defaultDataType: 'default', pages: { order: Object.keys(layouts ?? []) } },
  };

  jest.mocked(useExternalApis).mockReturnValue(externalApis as ExternalApisResult);
  jest.mocked(fetchProcessState).mockImplementation(async () => createProcess(test) ?? getProcessDataMock());
  jest.mocked(fetchInstanceData).mockImplementation(async () => createInstanceData(test));
}

function createApplicationMetadata({ stateless, instanceDataElements, dataModels }: FunctionTest): ApplicationMetadata {
  const applicationMetadata = getApplicationMetadataMock(
    stateless ? { onEntry: { show: 'layout-set' }, externalApiIds: ['testId'] } : {},
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
  return applicationMetadata;
}

function createProcess(test: FunctionTest): IProcess | undefined {
  const { process, permissions } = test;
  return process
    ? process
    : permissions
      ? getProcessDataMock((p) => {
          for (const key of Object.keys(permissions)) {
            p.currentTask![key] = permissions[key];
          }
        })
      : hasInstance(test)
        ? getProcessDataMock()
        : undefined;
}

function hasInstance({ instance, instanceDataElements, process, permissions }: FunctionTest): boolean {
  return Boolean(instance || instanceDataElements || process || permissions);
}

function createProfile(profileSettings: FunctionTest['profileSettings']): IProfile {
  const profile = getProfileMock();
  profile.profileSettingPreference.language = profileSettings?.language ?? defaultLanguage;
  return profile;
}

function createInstanceData(test: FunctionTest): IInstance {
  let instanceData = getInstanceDataMock();
  const instance = createInstance(test);
  if (instance) {
    instanceData = { ...instanceData, ...instance };
  }
  const { instanceDataElements, dataModels } = test;
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

function createInstance(test: FunctionTest): IInstance | undefined {
  const { instance, instanceDataElements } = test;
  return instance && instanceDataElements
    ? { ...instance, data: [...instance.data, ...instanceDataElements] }
    : !instance && instanceDataElements
      ? getInstanceDataMock((i) => {
          i.data = [...i.data, ...instanceDataElements];
        })
      : hasInstance(test)
        ? getInstanceDataMock((i) => {
            for (const key of Object.keys(instance || {})) {
              i[key] = instance![key];
            }
          })
        : undefined;
}

async function renderExpression(test: FunctionTest, expression: ExprValToActualOrExpr<ExprVal.Any>) {
  const { context, positionalArguments, valueArguments, stateless } = test;
  const renderer = (): React.ReactElement => (
    <ExpressionRunner
      context={context}
      expression={expression}
      positionalArguments={positionalArguments}
      valueArguments={valueArguments}
    />
  );
  const queries = createQueries(test, expression);
  if (stateless) {
    await renderWithoutInstanceAndLayout({
      withFormProvider: true,
      router: ({ children }) => (
        <StatelessRouter initialPage={context?.currentLayout ?? 'FormLayout'}>{children}</StatelessRouter>
      ),
      renderer,
      queries,
    });
  } else {
    await renderWithInstanceAndLayout({
      initialPage: context?.currentLayout ?? 'FormLayout',
      renderer,
      queries,
    });
  }
}

function createQueries(test: FunctionTest, expression: ExprValToActualOrExpr<ExprVal.Any>): Partial<AppQueries> {
  const { frontendSettings, codeLists } = test;
  return {
    fetchLayouts: async () => createLayouts(test, expression),
    fetchFormData: async (url: string) => fetchFormData(test, url),
    ...(frontendSettings ? { fetchApplicationSettings: async () => frontendSettings } : {}),
    fetchOptions: async (url: string) => {
      const codeListId = url.match(/api\/options\/(\w+)\?/)?.[1];
      if (!codeLists || !codeListId || !codeLists[codeListId]) {
        throw new Error(`No code lists found for ${url}`);
      }
      const data = codeLists[codeListId];
      return { data } as AxiosResponse<IRawOption[], unknown>;
    },
  };
}

function createLayouts(
  { layouts: _layouts }: FunctionTest,
  expression: ExprValToActualOrExpr<ExprVal.Any>,
): ILayoutCollection {
  const layouts = _layouts ? structuredClone(_layouts) : getDefaultLayouts();

  // Frontend will look inside the layout for data model bindings, expressions with dataModel and expressions with
  // optionLabel in order to figure out which data models and code lists to load.
  // Since the expression we're testing is not part of the layout, we need to add it here so that everything is
  // loaded correctly.
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
  return layouts;
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

async function fetchFormData({ dataModel, dataModels }: FunctionTest, url: string): Promise<unknown> {
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

async function assertExpr({ expression, expects, expectsFailure, ...rest }: FunctionTestBase) {
  // Makes sure we don't end up with any unexpected properties (if there are, these should probably be added as
  // dependencies for the expression in some way)
  expect(Object.keys(rest)).toHaveLength(0);

  const errorMock = window.logError as jest.Mock;
  const textContent = (await screen.findByTestId('expr-result')).textContent;
  const result = textContent ? JSON.parse(textContent) : null;

  if (expectsFailure !== undefined) {
    expect(errorMock).toHaveBeenCalledWith(expect.stringContaining(expectsFailure));
    expect(errorMock).toHaveBeenCalledTimes(1);
  } else {
    expect(errorMock).not.toHaveBeenCalled();
    ExprValidation.throwIfInvalid(expression);
    expect(result).toEqual(expects);
  }

  jest.clearAllMocks();
}
