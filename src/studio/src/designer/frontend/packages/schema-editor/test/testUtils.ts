import path from 'path';
import fs from 'fs';

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
    output.push([
      path.basename(filepath, '.json'),
      JSON.parse(fs.readFileSync(filepath, 'utf-8')),
    ]);
  });
  return output;
};

export const getSeresJsonSchemasForTest = (): any[] => {
  return getJsonSchemaForTest('Seres');
};

export const getGeneralJsonSchemasForTest = (): any[] => {
  return getJsonSchemaForTest('General');
};
