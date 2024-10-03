import type { AppFrontendVersion } from './version';
import { versionSettings } from './version';
import path from 'path';
import fs from 'fs';

export const writeToFile = (name: string, data: any, version: AppFrontendVersion) => {
  const dirPath = path.resolve(__dirname, versionSettings[version].componentSchemaPath);
  const fileName = `${dirPath}/${name}.schema.v1.json`;

  fs.writeFile(fileName, JSON.stringify(data), (err: any) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(`Wrote ${fileName}`);
  });
};
