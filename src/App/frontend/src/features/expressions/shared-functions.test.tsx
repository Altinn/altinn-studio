// import React from 'react';
// import type { PropsWithChildren } from 'react';
//
// import { jest } from '@jest/globals';
// import { screen } from '@testing-library/react';
// import type { AxiosResponse } from 'axios';
//
// import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
// import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
// import { getSubFormLayoutSetMock } from 'src/__mocks__/getLayoutSetsMock';
// import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
// import { getProfileMock } from 'src/__mocks__/getProfileMock';
// import { type FunctionTestBase, getSharedTests, type SharedTestFunctionContext } from 'src/features/expressions/shared';
// import { ExprVal } from 'src/features/expressions/types';
// import { ExprValidation } from 'src/features/expressions/validation';
// import { useExternalApis } from 'src/features/externalApi/useExternalApi';
// import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
// import {
//   getRepeatingBinding,
//   isRepeatingComponent,
//   RepeatingComponents,
// } from 'src/features/form/layout/utils/repeating';
// import { fetchApplicationMetadata, fetchInstanceData, fetchProcessState, fetchUserProfile } from 'src/queries/queries';
// import { AppQueries } from 'src/queries/types';
// import {
//   renderWithInstanceAndLayout,
//   renderWithoutInstanceAndLayout,
//   StatelessRouter,
// } from 'src/test/renderWithProviders';
// import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
// import { useEvalExpression } from 'src/utils/layout/generator/useEvalExpression';
// import { useDataModelBindingsFor, useExternalItem } from 'src/utils/layout/hooks';
// import type { ExprPositionalArgs, ExprValToActualOrExpr, ExprValueArgs } from 'src/features/expressions/types';
// import type { ExternalApisResult } from 'src/features/externalApi/useExternalApi';
// import type { IRawOption } from 'src/layout/common.generated';
// import type { IDataModelBindings, ILayoutCollection } from 'src/layout/layout';
// import type { IData, IDataType } from 'src/types/shared';
//
// // ---- DEBUG HARNESS START ----
// const START_TS = Date.now();
//
// function now() {
//   return `${((Date.now() - START_TS) / 1000).toFixed(1)}s`;
// }
//
// function dbg(label: string, extra?: unknown) {
//   console.error(`[DBG ${now()}] ${label}${extra !== undefined ? ` :: ${safe(extra)}` : ''}`);
// }
//
// function safe(v: unknown) {
//   try {
//     return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
//   } catch {
//     return String(v);
//   }
// }
//
// // Dump currently active Node handles (works in Jest's node env)
// function dumpActiveHandles(tag = 'active-handles') {
//   // @ts-expect-error - private API, but invaluable for hangs
//   const handles: unknown[] = (process as any)._getActiveHandles?.() || [];
//   // @ts-expect-error - private API
//   const reqs: unknown[] = (process as any)._getActiveRequests?.() || [];
//   const summarize = (arr: unknown[]) =>
//     arr.map((h: any) => ({
//       type: h?.constructor?.name,
//       // best-effort peek at timers/sockets/etc.
//       details: h?._onTimeout?.name || h?._idleTimeout || h?._handle?.fd || h?.fd || h?.threadId || h?.url || undefined,
//     }));
//   dbg(`${tag}`, { handles: summarize(handles), requests: summarize(reqs) });
//   return { handles: handles.length, requests: reqs.length };
// }
//
// // helpful in CI when something swallows rejections
// process.on('unhandledRejection', (reason) => {
//   dbg('UNHANDLED REJECTION', reason);
// });
// process.on('uncaughtException', (err) => {
//   dbg('UNCAUGHT EXCEPTION', { name: err.name, message: err.message, stack: err.stack?.split('\n').slice(0, 5) });
// });
// // ---- DEBUG HARNESS END ----
//
// jest.mock('src/features/externalApi/useExternalApi');
//
// beforeEach(() => {
//   const name = expect.getState().currentTestName;
//   dbg(`TEST START: ${name}`);
// });
//
// afterEach(() => {
//   const name = expect.getState().currentTestName;
//   const { handles, requests } = dumpActiveHandles(`TEST END (pre-clean): ${name}`);
//   dbg(`TEST END: ${name} (handles=${handles}, requests=${requests})`);
// });
//
// // Watchdog: if a single test is idle > 20s, print active handles repeatedly
// let watchdog: NodeJS.Timeout | undefined;
// beforeEach(() => {
//   clearInterval(watchdog as any);
//   let last = Date.now();
//   watchdog = setInterval(() => {
//     const name = expect.getState().currentTestName;
//     const idleSec = ((Date.now() - last) / 1000).toFixed(0);
//     dbg(`WATCHDOG idle=${idleSec}s in "${name}"`);
//     dumpActiveHandles('WATCHDOG DUMP');
//   }, 20_000);
//   // bump the "last activity" on common awaits
//   const origThen = Promise.prototype.then;
//   // @ts-expect-error monkey patch for debug only
//   Promise.prototype.then = function patchedThen(...args: any[]) {
//     last = Date.now();
//     // @ts-expect-error
//     return origThen.apply(this, args);
//   };
// });
//
// afterEach(() => clearInterval(watchdog as any));
//
// interface Props {
//   context: SharedTestFunctionContext | undefined;
//   expression: ExprValToActualOrExpr<ExprVal.Any>;
//   positionalArguments?: ExprPositionalArgs;
//   valueArguments?: ExprValueArgs;
// }
//
// function InnerExpressionRunner({ expression, positionalArguments, valueArguments }: Props) {
//   const result = useEvalExpression(expression, {
//     returnType: ExprVal.Any,
//     defaultValue: null,
//     positionalArguments,
//     valueArguments,
//   });
//   return <div data-testid='expr-result'>{JSON.stringify(result)}</div>;
// }
//
// function ExpressionRunner(props: Props) {
//   if (props.context === undefined || props.context.rowIndices === undefined || props.context.rowIndices.length === 0) {
//     return <InnerExpressionRunner {...props} />;
//   }
//
//   // Skipping this hook to make sure we can eval expressions without a layout as well. Some tests need to run
//   // without layout, and in those cases this hook will crash when we're missing the context. Breaking the rule of hooks
//   // eslint rule makes this conditional, and that's fine here.
//   // eslint-disable-next-line react-compiler/react-compiler
//   // eslint-disable-next-line react-hooks/rules-of-hooks
//   const layoutLookups = useLayoutLookups();
//
//   const parentIds: string[] = [];
//   let currentParent = layoutLookups.componentToParent[props.context.component];
//   while (currentParent && currentParent.type === 'node') {
//     const parentComponent = layoutLookups.getComponent(currentParent.id);
//     if (isRepeatingComponent(parentComponent)) {
//       parentIds.push(parentComponent.id);
//     }
//     currentParent = layoutLookups.componentToParent[currentParent.id];
//   }
//
//   if (parentIds.length !== props.context.rowIndices.length) {
//     throw new Error(
//       `Component '${props.context.component}' has ${parentIds.length} repeating parent components, ` +
//         `but rowIndices contains ${props.context.rowIndices.length} indices.`,
//     );
//   }
//
//   let result = <InnerExpressionRunner {...props} />;
//   for (const [i, parentId] of parentIds.entries()) {
//     const reverseIndex = props.context.rowIndices.length - i - 1;
//     const rowIndex = props.context.rowIndices[reverseIndex];
//
//     result = (
//       <DataModelLocationFor
//         id={parentId}
//         rowIndex={rowIndex}
//       >
//         {result}
//       </DataModelLocationFor>
//     );
//   }
//
//   return result;
// }
//
// function DataModelLocationFor<T extends RepeatingComponents>({
//   id,
//   rowIndex,
//   children,
// }: PropsWithChildren<{ id: string; rowIndex: number }>) {
//   const component = useExternalItem(id) as { type: T };
//   const bindings = useDataModelBindingsFor(id) as IDataModelBindings<T>;
//   const groupBinding = getRepeatingBinding(component.type, bindings);
//
//   if (!groupBinding) {
//     throw new Error(`No group binding found for ${id}`);
//   }
//
//   return (
//     <DataModelLocationProvider
//       groupBinding={groupBinding}
//       rowIndex={rowIndex}
//     >
//       {children}
//     </DataModelLocationProvider>
//   );
// }
//
// function getDefaultLayouts(): ILayoutCollection {
//   return {
//     default: {
//       data: {
//         layout: [
//           {
//             id: 'default',
//             type: 'Input',
//             dataModelBindings: {
//               simpleBinding: { dataType: 'default', field: 'mockField' },
//             },
//           },
//         ],
//       },
//     },
//   };
// }
//
// describe('Expressions shared function tests', () => {
//   beforeAll(() => {
//     jest
//       .spyOn(window, 'logError')
//       .mockImplementation(() => {})
//       .mockName('window.logError');
//     jest
//       .spyOn(window, 'logWarnOnce')
//       .mockImplementation(() => {})
//       .mockName('window.logWarnOnce');
//     jest
//       .spyOn(window, 'logErrorOnce')
//       .mockImplementation(() => {})
//       .mockName('window.logErrorOnce');
//   });
//
//   afterEach(() => {
//     jest.clearAllMocks();
//   });
//
//   afterAll(() => {
//     jest.restoreAllMocks();
//   });
//
//   const sharedTests = getSharedTests('functions').content;
//
//   describe.each(sharedTests)('Function: $folderName', (folder) => {
//     it.each(folder.content)('$name', async (test) => {
//       const {
//         disabledFrontend,
//         expression,
//         expects,
//         expectsFailure,
//         context,
//         layouts: _layouts,
//         dataModel,
//         dataModels,
//         instanceDataElements,
//         instance: _instance,
//         process: _process,
//         permissions,
//         frontendSettings,
//         textResources,
//         profileSettings,
//         externalApis,
//         positionalArguments,
//         valueArguments,
//         testCases,
//         codeLists,
//         stateless,
//       } = test;
//
//       if (disabledFrontend) {
//         // Skipped tests usually means that the frontend does not support the feature yet
//         return;
//       }
//
//       const hasInstance = Boolean(_instance || instanceDataElements || _process || permissions);
//
//       const instance =
//         _instance && instanceDataElements
//           ? { ..._instance, data: [..._instance.data, ...instanceDataElements] }
//           : !_instance && instanceDataElements
//             ? getInstanceDataMock((i) => {
//                 i.data = [...i.data, ...instanceDataElements];
//               })
//             : hasInstance
//               ? getInstanceDataMock((i) => {
//                   for (const key of Object.keys(_instance || {})) {
//                     i[key] = _instance![key];
//                   }
//                 })
//               : undefined;
//
//       const process = _process
//         ? _process
//         : permissions
//           ? getProcessDataMock((p) => {
//               for (const key of Object.keys(permissions)) {
//                 p.currentTask![key] = permissions[key];
//               }
//             })
//           : hasInstance
//             ? getProcessDataMock()
//             : undefined;
//
//       // This decides whether we load this in an instance or not. There are more things to load and more to
//       // do in an instance, so it's slower, but also required for some functions.
//       const layouts: ILayoutCollection = _layouts ? structuredClone(_layouts) : getDefaultLayouts();
//
//       // Frontend will look inside the layout for data model bindings, expressions with dataModel and expressions with
//       // optionLabel in order to figure out which data models and code lists to load.
//       // Since the expression we're testing is not part of the layout, we need to add it here so that everything is
//       // loaded correctly.
//       const firstPage = Object.values(layouts)[0];
//       firstPage?.data.layout.push({
//         id: 'theCurrentExpression',
//         type: 'NavigationButtons',
//         ...({
//           // This makes sure that the expression is never evaluated, as it is not a valid property. All properties
//           // that can handle expressions (like 'hidden') will be evaluated during hierarchy generation, but errors
//           // from there (such as unknown extra properties like this one) will not cause test failures here (so doing
//           // this is safe). DataModelsProvider however, will recursively look inside the layout and find anything
//           // that resembles an expression and load the data model it refers to. In other words, this makes sure we
//           // load any data models that are only references in the expression we're testing - not elsewhere in the
//           // layout. For an example of a test that would fail without this, see 'dataModel-non-default-model.json'.
//           // It has only a Paragraph component with no expressions in it, so without injecting the tested
//           // expression into that layout, DataModelsProvider would not load the data model that the expression refers
//           // to, and the test would fail.
//           notAnActualExpression: expression,
//         } as object),
//       });
//
//       const applicationMetadata = getIncomingApplicationMetadataMock(
//         stateless ? { onEntry: { show: 'layout-set' }, externalApiIds: ['testId'] } : {},
//       );
//       if (instanceDataElements) {
//         for (const element of instanceDataElements) {
//           if (!applicationMetadata.dataTypes!.find((dt) => dt.id === element.dataType)) {
//             applicationMetadata.dataTypes!.push({
//               id: element.dataType,
//               allowedContentTypes: null,
//               minCount: 0,
//               maxCount: 5,
//             });
//           }
//         }
//       }
//       if (dataModels) {
//         applicationMetadata.dataTypes.push(
//           ...(dataModels.map((dm) => ({
//             id: dm.dataElement.dataType,
//             appLogic: { classRef: 'some-class' },
//             taskId: 'Task_1',
//           })) as IDataType[]),
//         );
//       }
//       if (!applicationMetadata.dataTypes.find((d) => d.id === 'default')) {
//         applicationMetadata.dataTypes.push({
//           id: 'default',
//           appLogic: { classRef: 'some-class', taskId: 'Task_1' },
//         } as unknown as IDataType);
//       }
//
//       const profile = getProfileMock();
//       if (profileSettings?.language) {
//         profile.profileSettingPreference.language = profileSettings.language;
//       }
//
//       async function fetchFormData(url: string) {
//         if (!dataModels) {
//           return dataModel ?? {};
//         }
//
//         const statelessDataType = url.match(/dataType=([\w-]+)&/)?.[1];
//         const statefulDataElementId = url.match(/data\/([a-f0-9-]+)\?/)?.[1];
//
//         const model = dataModels.find(
//           (dm) => dm.dataElement.dataType === statelessDataType || dm.dataElement.id === statefulDataElementId,
//         );
//         if (model) {
//           return model.data;
//         }
//         throw new Error(`Datamodel ${url} not found in ${JSON.stringify(dataModels)}`);
//       }
//
//       // Clear localstorage, because LanguageProvider uses it to cache selected languages
//       localStorage.clear();
//
//       jest.mocked(fetchApplicationMetadata).mockResolvedValue(applicationMetadata);
//       jest.mocked(useExternalApis).mockReturnValue(externalApis as ExternalApisResult);
//       jest.mocked(fetchProcessState).mockImplementation(async () => process ?? getProcessDataMock());
//       jest.mocked(fetchUserProfile).mockImplementation(async () => profile);
//       jest.mocked(fetchInstanceData).mockImplementation(async () => {
//         let instanceData = getInstanceDataMock();
//         if (instance) {
//           instanceData = { ...instanceData, ...instance };
//         }
//         if (instanceDataElements) {
//           instanceData.data.push(...instanceDataElements);
//         }
//         if (dataModels) {
//           instanceData.data.push(...dataModels.map((dm) => dm.dataElement));
//         }
//         if (!instanceData.data.find((d) => d.dataType === 'default')) {
//           instanceData.data.push({ id: 'abc', dataType: 'default' } as IData);
//         }
//         return instanceData;
//       });
//
//       const toRender = (
//         <ExpressionRunner
//           context={context}
//           expression={expression}
//           positionalArguments={positionalArguments}
//           valueArguments={valueArguments}
//         />
//       );
//
//       const queries: Partial<AppQueries> = {
//         fetchLayoutSets: async () => ({
//           sets: [{ id: 'layout-set', dataType: 'default', tasks: ['Task_1'] }, getSubFormLayoutSetMock()],
//         }),
//         fetchLayouts: async () => layouts,
//         fetchFormData,
//         ...(frontendSettings ? { fetchApplicationSettings: async () => frontendSettings } : {}),
//         fetchTextResources: async () => ({
//           language: 'nb',
//           resources: textResources || [],
//         }),
//         fetchOptions: async (url: string) => {
//           const codeListId = url.match(/api\/options\/(\w+)\?/)?.[1];
//           if (!codeLists || !codeListId || !codeLists[codeListId]) {
//             throw new Error(`No code lists found for ${url}`);
//           }
//           const data = codeLists[codeListId];
//           return { data } as AxiosResponse<IRawOption[], unknown>;
//         },
//       };
//
//       const { rerender } = stateless
//         ? await renderWithoutInstanceAndLayout({
//             withFormProvider: true,
//             router: ({ children }) => (
//               <StatelessRouter initialPage={context?.currentLayout ?? 'FormLayout'}>{children}</StatelessRouter>
//             ),
//             renderer: () => toRender,
//             queries,
//           })
//         : await renderWithInstanceAndLayout({
//             initialPage: context?.currentLayout ?? 'FormLayout',
//             renderer: () => toRender,
//             queries,
//           });
//
//       await assertExpr({ expression, expects, expectsFailure });
//
//       if (testCases) {
//         for (const testCase of testCases) {
//           rerender(
//             <ExpressionRunner
//               context={context}
//               expression={testCase.expression}
//               positionalArguments={positionalArguments}
//               valueArguments={valueArguments}
//             />,
//           );
//           await assertExpr(testCase);
//         }
//       }
//     });
//   });
// });
//
// async function assertExpr({ expression, expects, expectsFailure, ...rest }: FunctionTestBase) {
//   // Makes sure we don't end up with any unexpected properties (if there are, these should probably be added as
//   // dependencies for the expression in some way)
//   expect(Object.keys(rest)).toHaveLength(0);
//
//   const errorMock = window.logError as jest.Mock;
//   const textContent = (await screen.findByTestId('expr-result')).textContent;
//   const result = textContent ? JSON.parse(textContent) : null;
//
//   if (expectsFailure !== undefined) {
//     expect(errorMock).toHaveBeenCalledWith(expect.stringContaining(expectsFailure));
//     expect(errorMock).toHaveBeenCalledTimes(1);
//   } else {
//     expect(errorMock).not.toHaveBeenCalled();
//     ExprValidation.throwIfInvalid(expression);
//     expect(result).toEqual(expects);
//   }
//
//   jest.clearAllMocks();
// }
