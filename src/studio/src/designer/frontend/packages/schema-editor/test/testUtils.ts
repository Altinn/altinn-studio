import path from 'path';
import fs from 'fs';

/**
 * Some schemas might not be valid
 */
export const ignoreTestSchemas: string[] = [];
/**
 * Returns an array with json schemas for test
 */

export const getJsonSchemaForTest = (folderName: string): any[] => {
  const dirpath = path.resolve(
    __dirname,
    '../../../../DataModeling.Tests/_TestData/Model/JsonSchema',
    folderName,
  );
  const output: any[] = [];
  fs.readdirSync(dirpath).forEach((filename) => {
    const filepath = path.resolve(dirpath, filename);
    const basename = path.basename(filepath, '.json');
    if (!ignoreTestSchemas.includes(basename)) {
      output.push([basename, JSON.parse(fs.readFileSync(filepath, 'utf-8'))]);
    }
  });
  return output;
};

export const getSeresJsonSchemasForTest = (): any[] => {
  return getJsonSchemaForTest('Seres');
};

export const getGeneralJsonSchemasForTest = (): any[] => {
  return getJsonSchemaForTest('General');
};
