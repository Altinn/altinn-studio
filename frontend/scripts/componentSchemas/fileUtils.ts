import type { AppFrontendVersion, ComponentName, ExpandedComponentSchema } from './types';
import { versionSettings } from './version';
import path from 'path';
import fs from 'fs';

export const writeToFile = (
  name: ComponentName,
  data: ExpandedComponentSchema,
  version: AppFrontendVersion,
) => {
  const dirPath = path.resolve(__dirname, versionSettings[version].componentSchemaPath);
  const fileName = `${dirPath}/${name}.schema.v1.json`;

  fs.writeFile(fileName, JSON.stringify(data), (err) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(`Wrote ${fileName}`);
  });
};
