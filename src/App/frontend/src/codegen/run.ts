import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import ts from 'typescript';

import { CodeGeneratorContext } from 'src/codegen/CodeGeneratorContext';
import {
  generateAllCommonTypes,
  generateCommonTypeScript,
  generateSerializedCommonTypeScript,
} from 'src/codegen/Common';
import { generateComponentCatalog } from 'src/codegen/ComponentCatalog';
import { type DocumentationLocale, generateComponentDocumentation } from 'src/codegen/ComponentDocumentation';
import { LayoutSchemaV1 } from 'src/codegen/schemas/layout.schema.v1';
import { LayoutSettingsSchemaV1 } from 'src/codegen/schemas/layoutSettings.schema.v1';
import { getWrittenPaths, saveFile, saveTsFile } from 'src/codegen/tools';
import { ExprVal } from 'src/features/expressions/types';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { SchemaFileProps } from 'src/codegen/SchemaFile';

type ComponentList = { [folder: string]: string };

const GENERATED_FILE_PATTERN = /\.generated\.(ts|tsx)$/;
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const CONTRACT_GENERATED_ROOT = path.join(REPOSITORY_ROOT, 'src/common/ts/layout-contract/src/generated');
const CONTRACT_GENERATED_IMPORT = '@app/layout-contract/generated';
const LEGACY_CONTRACT_RENDERER_ROOT = path.join(REPOSITORY_ROOT, 'src/common/ts/layout-contract/src/renderer');
const COMPONENT_CATALOG_OUTPUT = path.join(
  REPOSITORY_ROOT,
  'src/common/ts/layout-contract/src/component-catalog.generated.ts',
);
const CONTRACT_SCHEMA_ROOT = path.join(REPOSITORY_ROOT, 'src/common/ts/layout-contract/schemas/json');
const CONTRACT_DOCUMENTATION_ROOT = path.join(REPOSITORY_ROOT, 'src/common/ts/layout-contract/docs/components');
const STATIC_CONTRACT_SCHEMAS = ['layout/expression.schema.v1.json', 'component/number-format.schema.v1.json'] as const;

function toPosixPath(p: string): string {
  return p.split(path.sep).join('/');
}

async function findGeneratedFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  const entries = await fs.readdir(root, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await findGeneratedFiles(full)));
    } else if (entry.isFile() && GENERATED_FILE_PATTERN.test(entry.name)) {
      found.push(toPosixPath(full));
    }
  }
  return found;
}

async function deleteOrphans(orphans: string[]): Promise<void> {
  await Promise.all(
    orphans.map(async (file) => {
      console.log(`Removing orphaned ${file}`);
      await fs.rm(file);
    }),
  );
}

async function getComponentList(): Promise<[ComponentList, string[]]> {
  const toDelete: string[] = [];
  const out: ComponentList = {};
  const files = await fs.readdir('src/layout');
  for (const file of files) {
    const stat = await fs.stat(path.join('src/layout', file));
    if (!stat.isDirectory()) {
      continue;
    }

    const filesInside = (await fs.readdir(path.join('src/layout', file))).filter((f) => !f.includes('.generated.'));
    if (filesInside.length === 0) {
      toDelete.push(file);
      continue;
    }

    out[file] = file;
  }

  return [out, toDelete];
}

async function getExpressionFunctionsByReturnType(): Promise<ReadonlyMap<string, string[]>> {
  const fileName = 'src/features/expressions/expression-functions.ts';
  const source = ts.createSourceFile(
    fileName,
    await fs.readFile(fileName, 'utf-8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const result = new Map<string, string[]>();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'ExprFunctionDefinitions') {
        continue;
      }
      const initializer = declaration.initializer;
      const object = initializer && ts.isSatisfiesExpression(initializer) ? initializer.expression : initializer;
      if (!object || !ts.isObjectLiteralExpression(object)) {
        throw new Error('ExprFunctionDefinitions must be an object literal');
      }
      for (const property of object.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
          continue;
        }
        const definition = property.initializer;
        if (!ts.isObjectLiteralExpression(definition)) {
          continue;
        }
        const returns = definition.properties.find(
          (candidate): candidate is ts.PropertyAssignment =>
            ts.isPropertyAssignment(candidate) && ts.isIdentifier(candidate.name) && candidate.name.text === 'returns',
        );
        if (!returns || !ts.isPropertyAccessExpression(returns.initializer)) {
          throw new Error(`Expression function ${property.name.text} must declare an ExprVal return type`);
        }
        const returnType = returns.initializer.name.text;
        result.set(returnType, [...(result.get(returnType) ?? []), property.name.text]);
      }
      return result;
    }
  }
  throw new Error('Could not find ExprFunctionDefinitions');
}

export async function generateLayoutContracts() {
  const [componentList, toDelete] = await getComponentList();

  for (const emptyFolder of toDelete) {
    console.log(`Deleting empty folder src/layout/${emptyFolder}`);
    await fs.rm(path.join('src/layout', emptyFolder), { recursive: true });
  }

  const sortedKeys = Object.keys(componentList).sort((a, b) => a.localeCompare(b));
  const configMap: { [key: string]: ComponentConfig } = {};
  for (const key of sortedKeys) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require(`src/layout/${key}/config`).Config;
    config.setType(componentList[key], key);
    configMap[key] = config;
  }
  const configurableKeys = sortedKeys.filter((key) => configMap[key].config.availability === 'configurable');
  const runtimeComponentIndex = [
    '// This file is generated by running `yarn gen`',
    '',
    `import type { ComponentTypeConfigs as GeneratedComponentTypeConfigs } from '${CONTRACT_GENERATED_IMPORT}/components.generated';`,
    '',
    ...sortedKeys.map(
      (key) => `import { getConfig as get${key}Config } from 'src/layout/${key}/config.runtime.generated';`,
    ),
    '',
    `function createComponentConfigs() {`,
    `  return {`,
    ...sortedKeys.map((key) => `    ${componentList[key]}: get${key}Config(),`),
    `  };`,
    `}`,
    '',
    `let componentConfigs: ReturnType<typeof createComponentConfigs> | null = null;`,
    `export function getComponentConfigs() {`,
    `  return componentConfigs ?? (componentConfigs = createComponentConfigs());`,
    `}`,
    '',
    `export type ComponentTypeConfigs = GeneratedComponentTypeConfigs;`,
  ];
  const contractComponentIndex = [
    '// This file is generated by running `yarn gen`',
    '',
    ...sortedKeys.map(
      (key) =>
        `import type { TypeConfig as ${key}TypeConfig } from '${CONTRACT_GENERATED_IMPORT}/components/${key}/config.generated';`,
    ),
    '',
    `export type ComponentTypeConfigs = {`,
    ...sortedKeys.map((key) => `  ${componentList[key]}: ${key}TypeConfig;`),
    `};`,
    '',
    `export type ConfigurableComponent =`,
    ...configurableKeys.map(
      (key, index) => `  | ${key}TypeConfig['layout']${index === configurableKeys.length - 1 ? ';' : ''}`,
    ),
    `export type CompExternal = ComponentTypeConfigs[keyof ComponentTypeConfigs]['layout'];`,
  ];
  const serializedComponentIndex = [
    '// This file is generated by running `yarn gen`',
    '',
    ...configurableKeys.map(
      (key) =>
        `import type { Comp${key}Serialized } from '${CONTRACT_GENERATED_IMPORT}/components/${key}/serialized.generated';`,
    ),
    '',
    `export enum ComponentType {`,
    ...configurableKeys.map((key) => `  ${componentList[key]} = '${componentList[key]}',`),
    `}`,
    '',
    `export type SerializedComponent =`,
    ...configurableKeys.map(
      (key, index) => `  | Comp${key}Serialized${index === configurableKeys.length - 1 ? ';' : ''}`,
    ),
  ];

  const promises: Promise<void>[] = [];
  const contractComponentIndexPath = path.join(CONTRACT_GENERATED_ROOT, 'components.generated.ts');
  await fs.mkdir(path.join(CONTRACT_GENERATED_ROOT, 'components'), { recursive: true });
  promises.push(saveTsFile(contractComponentIndexPath, { result: contractComponentIndex.join('\n') }));
  promises.push(
    saveTsFile(path.join(CONTRACT_GENERATED_ROOT, 'serialized-components.generated.ts'), {
      result: serializedComponentIndex.join('\n'),
    }),
  );
  const expressionFunctionNames = await getExpressionFunctionsByReturnType();
  const expressionFunctionsByReturn = Object.entries(ExprVal).map(([returnTypeName, returnType]) => {
    const functionNames = (expressionFunctionNames.get(returnTypeName) ?? []).map((name) => JSON.stringify(name));
    return `  ${JSON.stringify(returnType)}: ${functionNames.length ? functionNames.join(' | ') : 'never'};`;
  });
  promises.push(
    saveTsFile(path.join(CONTRACT_GENERATED_ROOT, 'expression-functions.generated.ts'), {
      result: [
        '// This file is generated by running `yarn gen`',
        '',
        `export type ExpressionFunctionNameByReturn = {`,
        ...expressionFunctionsByReturn,
        `};`,
      ].join('\n'),
    }),
  );
  promises.push(saveTsFile('src/layout/components.generated.ts', { result: runtimeComponentIndex.join('\n') }));

  // Make sure all common types has been generated first, so that they don't start extending
  // each other after being frozen
  generateAllCommonTypes(configMap);

  for (const key of sortedKeys) {
    const componentOutputRoot = path.join(CONTRACT_GENERATED_ROOT, 'components', key);
    await fs.mkdir(componentOutputRoot, { recursive: true });
    const tsPathConfig = path.join(componentOutputRoot, 'config.generated.ts');
    const tsPathSerialized = path.join(componentOutputRoot, 'serialized.generated.ts');
    const tsPathDef = `src/layout/${key}/config.def.generated.ts`;
    const tsPathRuntime = `src/layout/${key}/config.runtime.generated.ts`;
    const configModule = `${CONTRACT_GENERATED_IMPORT}/components/${key}/config.generated`;

    const result = await CodeGeneratorContext.generateTypeScript(configModule, () =>
      configMap[key].generateConfigTypes(),
    );
    const serialized = await CodeGeneratorContext.generateTypeScript(
      `${CONTRACT_GENERATED_IMPORT}/components/${key}/serialized.generated`,
      () => configMap[key].generateSerializedType(),
      'serialized',
    );
    const defClass = await CodeGeneratorContext.generateTypeScript(tsPathDef, () => {
      const def = configMap[key].generateDefClass();
      return def;
    });
    const runtimeConfig = await CodeGeneratorContext.generateTypeScript(tsPathRuntime, () =>
      configMap[key].generateRuntimeConfigFile(),
    );

    promises.push(saveTsFile(tsPathConfig, result));
    if (configMap[key].config.availability === 'configurable') {
      promises.push(saveTsFile(tsPathSerialized, serialized));
    }
    promises.push(saveTsFile(tsPathDef, defClass));
    promises.push(saveTsFile(tsPathRuntime, runtimeConfig));
  }

  const schemaProps: SchemaFileProps = { configMap, componentList, sortedKeys };
  const componentCatalog = generateComponentCatalog(schemaProps);
  const prettierConfig = await resolveConfig(COMPONENT_CATALOG_OUTPUT);
  promises.push(
    saveFile(
      COMPONENT_CATALOG_OUTPUT,
      await format(componentCatalog.source, {
        ...prettierConfig,
        parser: 'typescript',
        filepath: COMPONENT_CATALOG_OUTPUT,
      }),
    ),
  );
  await fs.mkdir(CONTRACT_DOCUMENTATION_ROOT, { recursive: true });
  for (const locale of ['nb', 'en'] satisfies DocumentationLocale[]) {
    for (const [componentType, markdown] of generateComponentDocumentation(
      componentCatalog.componentCatalog,
      componentCatalog.commonProperties,
      locale,
    )) {
      const documentationPath = path.join(
        CONTRACT_DOCUMENTATION_ROOT,
        `${componentType}.properties.${locale}.generated.md`,
      );
      promises.push(
        saveFile(
          documentationPath,
          await format(markdown, {
            ...prettierConfig,
            filepath: documentationPath,
          }),
        ),
      );
    }
  }
  const schemas = [new LayoutSchemaV1(schemaProps), new LayoutSettingsSchemaV1(schemaProps)];

  const schemaPathBase = 'schemas/json/';
  await fs.mkdir(CONTRACT_SCHEMA_ROOT, { recursive: true });
  for (const file of schemas) {
    const schema = await CodeGeneratorContext.generateJsonSchema(schemaPathBase, file);
    promises.push(
      saveFile(path.join(CONTRACT_SCHEMA_ROOT, file.getFileName()), JSON.stringify(schema.result, null, 2)),
    );
  }
  for (const schemaPath of STATIC_CONTRACT_SCHEMAS) {
    const sourcePath = path.join('schemas/json', schemaPath);
    const targetPath = path.join(CONTRACT_SCHEMA_ROOT, schemaPath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    promises.push(saveFile(targetPath, await fs.readFile(sourcePath, 'utf-8')));
  }

  const commonTsPath = path.join(CONTRACT_GENERATED_ROOT, 'common.generated.ts');
  const serializedCommonTsPath = path.join(CONTRACT_GENERATED_ROOT, 'serialized-common.generated.ts');
  const commonTypeScript = await CodeGeneratorContext.generateTypeScript(
    `${CONTRACT_GENERATED_IMPORT}/common.generated`,
    () => {
      generateCommonTypeScript();
      return ''; // Empty content, because all symbols are exported and registered in the context
    },
  );
  const serializedCommonTypeScript = await CodeGeneratorContext.generateTypeScript(
    `${CONTRACT_GENERATED_IMPORT}/serialized-common.generated`,
    () => {
      generateSerializedCommonTypeScript();
      return '';
    },
    'serialized',
  );
  promises.push(saveTsFile(commonTsPath, commonTypeScript));
  promises.push(saveTsFile(serializedCommonTsPath, serializedCommonTypeScript));

  await Promise.all(promises);

  const written = getWrittenPaths();
  const orphans = [
    ...(await findGeneratedFiles('src/layout')).filter((file) => !written.has(file)),
    ...(await findGeneratedFiles(CONTRACT_GENERATED_ROOT)).filter((file) => !written.has(file)),
    ...(await findGeneratedFiles(LEGACY_CONTRACT_RENDERER_ROOT)),
  ];
  const documentationOrphans = (await findGeneratedDocumentation(CONTRACT_DOCUMENTATION_ROOT)).filter(
    (file) => !written.has(file),
  );
  await deleteOrphans([...orphans, ...documentationOrphans]);
  await fs.rm(LEGACY_CONTRACT_RENDERER_ROOT, { recursive: true, force: true });
}

async function findGeneratedDocumentation(root: string): Promise<string[]> {
  return (await fs.readdir(root))
    .filter((file) => file.endsWith('.generated.md'))
    .map((file) => toPosixPath(path.join(root, file)));
}
