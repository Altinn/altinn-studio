import fs from 'node:fs';

import type { ExprPositionalArgs, ExprVal, ExprValToActualOrExpr, ExprValueArgs } from 'src/features/expressions/types';
import type { ExternalApisResult } from 'src/features/externalApi/useExternalApi';
import type { IRawTextResource } from 'src/features/language/textResources';
import type { IRawOption } from 'src/layout/common.generated';
import type { ILayoutCollection } from 'src/layout/layout';
import type { IApplicationSettings, IData, IInstance, IProcess, ITask } from 'src/types/shared';

export type DataModelAndElement = {
  dataElement: IData;
  data: unknown;
};

interface SharedTest {
  name: string;
  disabledFrontend?: boolean;
  layouts?: ILayoutCollection;
  dataModel?: unknown;
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
  expectsWarnings?: string[];
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
  const fullPath = `${__dirname}/shared-tests/${parentPath}/${subPath}`;

  fs.readdirSync(fullPath).forEach((name) => {
    const isDir = fs.statSync(`${fullPath}/${name}`).isDirectory();
    if (isDir) {
      out.content.push(getSharedTests(name as keyof TestFolders, `${parentPath}/${subPath}`));
    } else if (name.endsWith('.json')) {
      const testJson = fs.readFileSync(`${fullPath}/${name}`);
      const test = JSON.parse(testJson.toString());
      test.name += ` (${name})`;
      out.content.push(test);
    }
  });

  return out;
}
