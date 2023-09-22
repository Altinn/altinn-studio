import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

import { cleanLayout } from 'src/features/layout/fetch/fetchFormLayoutSagas';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { ILayoutFileExternal } from 'src/layout/common.generated';
import type { ILayouts } from 'src/layout/layout';
import type { ILayoutSet, ILayoutSets } from 'src/types';
import type { IDataType } from 'src/types/shared';

interface AppLayoutSet {
  appName: string;
  appRoot: string;
  setName: string;
  set: ILayoutSet | undefined;
  layouts: ILayouts;
  entireFiles: { [key: string]: unknown };
}

interface AppLayoutSetWithDataModelSchema extends AppLayoutSet {
  modelPath: string;
  dataType: string;
  appMetadata: IApplicationMetadata;
  dataTypeDef: IDataType | undefined;
}

interface InternalSet {
  folder: string;
  plain: boolean;
  actualSet?: ILayoutSet;
}

/**
 * Get all layout sets from all apps
 * This expects to be pointed to a directory containing all known apps, in a structure like that
 * created from:
 * @see https://github.com/olemartinorg/altinn-fetch-apps
 */
export function getAllLayoutSets(dir: string): AppLayoutSet[] {
  const out: AppLayoutSet[] = [];
  const apps = getAllApps(dir);
  for (const app of apps) {
    const sets: InternalSet[] = [{ folder: 'layouts', plain: true }];
    const layoutSetsPath = path.join(dir, app, 'App/ui/layout-sets.json');
    if (fs.existsSync(layoutSetsPath)) {
      const content = fs.readFileSync(layoutSetsPath);
      const layoutSets = parseJsonTolerantly<ILayoutSets>(content.toString());
      sets.pop();

      for (const set of layoutSets.sets) {
        sets.push({ folder: set.id, plain: false, actualSet: set });
      }
    }

    for (const set of sets) {
      const setPath = [dir, app, 'App/ui', set.folder, set.plain ? '' : 'layouts'];
      const layoutRoot = path.join(...setPath);
      const layoutFiles: string[] = [];
      if (fs.existsSync(layoutRoot)) {
        layoutFiles.push(...fs.readdirSync(layoutRoot));
      } else if (set.plain && fs.existsSync(path.join(...setPath, '../FormLayout.json'))) {
        layoutFiles.push('../FormLayout.json');
      } else {
        continue;
      }

      const layouts: ILayouts = {};
      const entireFiles: { [key: string]: unknown } = {};
      for (const layoutFile of layoutFiles.filter((s) => s.endsWith('.json'))) {
        const basename = path.basename(layoutFile).replace('.json', '');
        const fileContent = fs.readFileSync(path.join(...setPath, layoutFile));
        const layoutContent = parseJsonTolerantly<ILayoutFileExternal>(fileContent.toString().trim());
        layouts[basename] = cleanLayout(layoutContent.data.layout, false);
        entireFiles[basename] = layoutContent;
      }

      out.push({
        appName: app,
        appRoot: path.join(dir, app),
        setName: set.folder,
        set: set.actualSet,
        layouts,
        entireFiles,
      });
    }
  }

  return out;
}

export function getAllLayoutSetsWithDataModelSchema(dir: string): {
  out: AppLayoutSetWithDataModelSchema[];
  notFound: string[];
} {
  const out: AppLayoutSetWithDataModelSchema[] = [];
  const notFound: string[] = [];
  const allLayoutSets = getAllLayoutSets(dir);
  for (const idx in allLayoutSets) {
    const item = allLayoutSets[idx];
    const appRoot = item.appRoot;
    const set = item.set;
    const appMetadata = getApplicationMetaData(appRoot);
    const allDataTypes = appMetadata.dataTypes.filter((dt) => dt.appLogic?.classRef);

    let dataType = set?.dataType;
    if (!dataType && set?.tasks?.length === 1) {
      const task = set.tasks[0];
      dataType = allDataTypes.find((dt) => dt.taskId === task)?.id;
    }
    if (!dataType && allDataTypes.length === 1) {
      dataType = allDataTypes[0].id;
    }

    const modelsDir = `${appRoot}/App/models`;
    if (!fs.existsSync(modelsDir)) {
      notFound.push(`${item.appName}/${item.setName} (no models dir)`);
      continue;
    }

    const modelsDirFiles = fs.readdirSync(modelsDir);
    const allDataTypesWithSchemaFiles = allDataTypes.filter((dt) => modelsDirFiles.includes(`${dt.id}.schema.json`));

    if (!dataType && allDataTypesWithSchemaFiles.length === 1) {
      dataType = allDataTypes[0].id;
    }

    if (!dataType) {
      notFound.push(`${item.appName}/${item.setName} (no data type)`);
      continue;
    }

    const dataTypeDef = appMetadata.dataTypes.find((dt) => dt.id === dataType);
    const modelPath = modelsDirFiles.includes(`${dataType}.schema.json`)
      ? `${appRoot}/App/models/${dataType}.schema.json`
      : undefined;
    if (!modelPath) {
      notFound.push(`${item.appName}/${item.setName} (no model schema)`);
      continue;
    }

    out.push({ ...item, modelPath, dataType, dataTypeDef, appMetadata });
  }

  return { out, notFound };
}

function getApplicationMetaData(appRoot: string) {
  const appJson = fs.readFileSync(path.join(appRoot, 'App/config/applicationmetadata.json'), 'utf-8');
  return parseJsonTolerantly<IApplicationMetadata>(appJson);
}

/**
 * Get all apps, as a list of paths
 */
export function getAllApps(dir: string): string[] {
  const out: string[] = [];
  const apps = fs.readdirSync(dir);
  for (const app of apps) {
    if (app.startsWith('.')) {
      continue;
    }

    out.push(app);
  }

  return out;
}

/**
 * Utility function used to get the path to a directory containing all known apps.
 * Only call this from unit tests, and be sure to stop the test if it fails.
 */
export function ensureAppsDirIsSet(runVoidTest = true) {
  const env = dotenv.config();
  const dir = env.parsed?.ALTINN_ALL_APPS_DIR;
  if (!dir) {
    if (runVoidTest) {
      it('did not find any apps', () => {
        expect(true).toBeTruthy();
      });
    }

    console.warn(
      'ALTINN_ALL_APPS_DIR should be set, please create a .env file and point it to a directory containing all known apps',
    );
    return false;
  }

  return dir;
}

/**
 * Parse JSON that may contain comments, trailing commas, etc.
 */
export function parseJsonTolerantly<T = any>(content: string): T {
  // Remove multiline comments
  content = content.replace(/\/\*([\s\S]*?)\*\//g, '$1');

  // Remove single-line comments, but not in strings
  content = content.replace(/^(.*?)\/\/(.*)$/gm, (_, m1, m2) => {
    const quoteCount = m1.split(/(?<!\\)"/).length - 1;
    if (quoteCount % 2 === 0) {
      return m1;
    }

    return `${m1}//${m2}`;
  });

  // Remove trailing commas
  content = content.replace(/,\s*([\]}])/g, '$1');

  // Remove zero-width spaces, non-breaking spaces, etc.
  content = content.replace(/[\u200B-\u200D\uFEFF]/g, '');

  try {
    return JSON.parse(content);
  } catch (e) {
    const position = e.message.match(/position (\d+)/);
    if (position) {
      const pos = parseInt(position[1], 10);
      const before = content.substring(0, pos);
      const line = before.split('\n').length;
      const column = before.split('\n').pop()?.length ?? 0;
      throw new Error(`${e.message} (line ${line}, column ${column})`);
    }

    throw new Error(`Failed to parse JSON: ${e.message}`);
  }
}
