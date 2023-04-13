import fs from 'node:fs';
import path from 'node:path';

import type { ILayouts } from 'src/layout/layout';
import type { ILayoutSets } from 'src/types';

interface AppLayoutSet {
  appName: string;
  setName: string;
  layouts: ILayouts;
}

/**
 * Get all layout sets from all apps
 * This expects to be pointed to a directory containing all known apps, in a structure like that
 * created from:
 * @see https://github.com/olemartinorg/altinn-fetch-apps
 */
export function getAllLayoutSets(dir: string): AppLayoutSet[] {
  const out: AppLayoutSet[] = [];
  const apps = fs.readdirSync(dir);
  for (const app of apps) {
    if (app.startsWith('.')) {
      continue;
    }

    const sets = [{ set: 'layouts', plain: true }];
    try {
      const content = fs.readFileSync(path.join(dir, app, 'App/ui/layout-sets.json'));
      const layoutSets = JSON.parse(content.toString()) as ILayoutSets;
      sets.pop();

      for (const set of layoutSets.sets) {
        sets.push({ set: set.id, plain: false });
      }
    } catch (e) {
      // Intentionally empty
    }

    for (const set of sets) {
      const setPath = [dir, app, 'App/ui', set.set, set.plain ? '' : 'layouts'];
      let layoutFiles: string[] = [];
      try {
        layoutFiles = fs.readdirSync(path.join(...setPath));
      } catch (e) {
        continue;
      }

      const layouts: ILayouts = {};
      for (const layoutFile of layoutFiles.filter((s) => !s.startsWith('.') && s.endsWith('.json'))) {
        const fileContent = fs.readFileSync(path.join(...setPath, layoutFile));
        let layoutContent;
        try {
          layoutContent = JSON.parse(fileContent.toString().trim());
        } catch (e) {
          // console.log('  ', layoutFile, '(failed to parse)', e);
          continue;
        }
        layouts[layoutFile.replace('.json', '')] = layoutContent.data.layout;
      }

      out.push({
        appName: app,
        setName: set.set,
        layouts,
      });
    }
  }

  return out;
}
