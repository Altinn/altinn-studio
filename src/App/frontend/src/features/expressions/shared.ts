import fs from 'node:fs';
import path from 'node:path';
import type { IRawOption } from '@app/layout-contract/generated/common.generated';

import type { ExternalApisResult } from 'src/core/queries/externalApi';
import type { ExprPositionalArgs, ExprVal, ExprValToActualOrExpr, ExprValueArgs } from 'src/features/expressions/types';
import type { IRawTextResource } from 'src/features/language/textResources';
import type { ILayoutCollection } from 'src/layout/layout';
import type { IApplicationSettings, IData, IInstance, IProcess, ITask } from 'src/types/shared';

export type DataModelAndElement = {
  dataElement: IData;
  data: object;
};

interface SharedTest {
  name: string;
  disabledFrontend?: boolean;
  disabledBackend?: boolean;
  layouts?: ILayoutCollection;
  dataModel?: object;
  dataModels?: DataModelAndElement[];
  instance?: IInstance;
  process?: IProcess;
  instanceDataElements?: IData[];
  permissions?: ITask;
  frontendSettings?: IApplicationSettings;
  textResources?: IRawTextResource[];
  profileSettings?: {
    language?: string;
  };
  externalApis?: ExternalApisResult;
  codeLists?: Record<string, IRawOption[]>;
  stateless?: boolean;
}

export interface SharedTestContext {
  component: string;
  currentLayout: string;
}

export interface SharedTestFunctionContext extends SharedTestContext {
  rowIndices?: number[];
}

export interface SharedTestContextList extends SharedTestFunctionContext {
  children?: SharedTestContext[];
}

export interface ContextTest extends SharedTest {
  expectedContexts: SharedTestContextList[];
}

export interface FunctionTestBase {
  expression: ExprValToActualOrExpr<ExprVal.Any>;
  expects?: unknown;
  expectsFailure?: string;
  expectsFailureBackend?: string;
  name?: string;
}

type FullFunctionTest = FunctionTestBase & SharedTest;

export interface FunctionTest extends FullFunctionTest {
  testCases?: FunctionTestBase[];
  context?: SharedTestFunctionContext;
  positionalArguments?: ExprPositionalArgs;
  valueArguments?: ExprValueArgs;
}

export interface LayoutPreprocessorTest {
  name: string;
  layouts: ILayoutCollection;
  expects: ILayoutCollection;
  expectsErrors?: string[];
}

interface TestFolder<T> {
  folderName: string;
  content: T[];
}

interface TestFolders {
  'context-lists': TestFolder<TestFolder<ContextTest>>;
  functions: TestFolder<TestFolder<FunctionTest>>;
  invalid: TestFolder<FunctionTest>;
  'layout-preprocessor': TestFolder<LayoutPreprocessorTest>;
}

export function getSharedTests<Folder extends keyof TestFolders>(
  subPath: Folder,
  parentPath = '',
): TestFolders[Folder] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: TestFolder<any> = {
    folderName: subPath,
    content: [],
  };
  const fullPath = path.join(__dirname, '../../../../../common/expression-tests/evaluation', parentPath, subPath);

  fs.readdirSync(fullPath).forEach((name) => {
    const isDir = fs.statSync(`${fullPath}/${name}`).isDirectory();
    if (isDir) {
      out.content.push(getSharedTests(name as keyof TestFolders, [parentPath, subPath].filter(Boolean).join('/')));
    } else if (name.endsWith('.json')) {
      const testJson = fs.readFileSync(`${fullPath}/${name}`);
      const test = JSON.parse(testJson.toString());
      test.name += ` (${name})`;
      out.content.push(test);
    }
  });

  return out;
}

export interface CalculationTestCase {
  name?: string;
  comment?: string;
  disabledFrontend?: boolean;
  disabledBackend?: boolean;
  dataModel?: object;
  dataModels?: DataModelAndElement[];
  calculations?: unknown[] | Record<string, unknown[]>;
  expects?: object;
  expectsFailure?: string;
  expectsFailureBackend?: string;
  expectsWarnings?: string[];
  expectsErrors?: string[];
}

export interface CalculationTest extends CalculationTestCase {
  name: string;
  testCases?: CalculationTestCase[];
}

export interface CalculationTestFile {
  /** The path of the file in the calculation folder, such as 'lists/merge-rows.json' */
  file: string;
  test: CalculationTest;
}

export const calculationTestsPath = path.join(__dirname, '../../../../../common/expression-tests/calculation');
export const calculationTestSchemaFile = 'model.schema.json';

/**
 * Loads the shared calculation tests in src/common/expression-tests/calculation, including every sub folder, so a
 * new folder cannot be left out. The data model schema they share is model.schema.json in the same folder.
 */
export function getSharedCalculationTests(): CalculationTestFile[] {
  const out: CalculationTestFile[] = [];
  function visit(relativePath: string) {
    for (const name of fs.readdirSync(path.join(calculationTestsPath, relativePath)).sort()) {
      const file = relativePath ? `${relativePath}/${name}` : name;
      if (fs.statSync(path.join(calculationTestsPath, file)).isDirectory()) {
        visit(file);
      } else if (name.endsWith('.json') && file !== calculationTestSchemaFile) {
        out.push({ file, test: JSON.parse(fs.readFileSync(path.join(calculationTestsPath, file)).toString()) });
      }
    }
  }
  visit('');
  return out;
}

/**
 * The cases in a calculation test file: the root when it has an expectation, then each test case, which inherits the
 * data models, the calculations and the disabled markers it does not set from the root.
 */
export function getCalculationTestCases(test: CalculationTest): CalculationTestCase[] {
  const hasExpectation =
    test.expects !== undefined || test.expectsFailure !== undefined || test.expectsFailureBackend !== undefined;
  const cases: CalculationTestCase[] = hasExpectation ? [test] : [];
  for (const testCase of test.testCases ?? []) {
    const hasOwnData = testCase.dataModel !== undefined || testCase.dataModels !== undefined;
    cases.push({
      name: `${test.name} / ${testCase.name}`,
      comment: testCase.comment ?? test.comment,
      disabledFrontend: test.disabledFrontend || testCase.disabledFrontend,
      disabledBackend: test.disabledBackend || testCase.disabledBackend,
      dataModel: hasOwnData ? testCase.dataModel : test.dataModel,
      dataModels: hasOwnData ? testCase.dataModels : test.dataModels,
      calculations: testCase.calculations ?? test.calculations,
      expects: testCase.expects,
      expectsFailure: testCase.expectsFailure,
      expectsFailureBackend: testCase.expectsFailureBackend,
      expectsWarnings: testCase.expectsWarnings,
      expectsErrors: testCase.expectsErrors,
    });
  }
  return cases;
}
