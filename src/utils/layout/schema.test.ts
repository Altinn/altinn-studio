import Ajv from 'ajv';
import dotenv from 'dotenv';
import fs from 'node:fs';
import numberFormatSchema from 'schemas/json/component/number-format.schema.v1.json';
import expressionSchema from 'schemas/json/layout/expression.schema.v1.json';
import layoutSchema from 'schemas/json/layout/layout.schema.v1.json';
import type { ErrorObject } from 'ajv';

import { getAllLayoutSets } from 'src/utils/layout/getAllLayoutSets';

describe('Layout schema', () => {
  describe('All schemas should be valid', () => {
    const recurse = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (fs.lstatSync(`${dir}/${file}`).isDirectory()) {
          recurse(`${dir}/${file}`);
          continue;
        }

        if (!file.endsWith('.json')) {
          continue;
        }

        it(`${dir}/${file} should be parseable as JSON`, () => {
          const content = fs.readFileSync(`${dir}/${file}`, 'utf-8');
          expect(() => JSON.parse(content)).not.toThrow();

          const schema = JSON.parse(content);
          const ajv = new Ajv();
          expect(ajv.validateSchema(schema)).toBeTruthy();
        });
      }
    };

    recurse('schemas');
  });

  describe('All known layout sets should validate against the layout schema', () => {
    const env = dotenv.config();
    const dir = env.parsed?.ALTINN_ALL_APPS_DIR;
    if (!dir) {
      it('did not find any apps', () => {
        expect(true).toBeTruthy();
      });
      console.warn(
        'ALTINN_ALL_APPS_DIR should be set, please create a .env file and point it to a directory containing all known apps',
      );
      return;
    }

    const ajv = new Ajv({
      strict: false,
      schemas: [expressionSchema, numberFormatSchema],
    });
    const validate = ajv.compile(layoutSchema);
    const allLayoutSets = getAllLayoutSets(dir);

    const ignoreSomeErrors = (errors: ErrorObject[] | null | undefined) =>
      (errors || []).filter((error) => {
        if (error.instancePath.endsWith('/id') && error.message?.startsWith('must match pattern')) {
          // Ignore errors about id not matching pattern. This is common, and we don't care that much about it.
          return false;
        }
        if (error.message?.startsWith("must have required property 'size'")) {
          // Fairly common for Header components. Maybe we should make this one optional?
          return false;
        }

        return true;
      });

    for (const { appName, setName, entireFiles } of allLayoutSets) {
      for (const layoutName of Object.keys(entireFiles)) {
        const layout = entireFiles[layoutName];
        it(`${appName}/${setName}/${layoutName}`, () => {
          validate(layout);
          expect(ignoreSomeErrors(validate.errors)).toEqual([]);
        });
      }
    }
  });
});
