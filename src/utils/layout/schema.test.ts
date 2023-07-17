import Ajv from 'ajv';
import dotenv from 'dotenv';
import JsonPointer from 'jsonpointer';
import fs from 'node:fs';
import applicationMetadataSchema from 'schemas/json/application/application-metadata.schema.v1.json';
import numberFormatSchema from 'schemas/json/component/number-format.schema.v1.json';
import expressionSchema from 'schemas/json/layout/expression.schema.v1.json';
import layoutSchema from 'schemas/json/layout/layout.schema.v1.json';
import textResourcesSchema from 'schemas/json/text-resources/text-resources.schema.v1.json';
import type { ErrorObject } from 'ajv';

import { getAllApps, getAllLayoutSets } from 'src/utils/layout/getAllLayoutSets';

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

        return !error.message?.startsWith("must have required property 'size'");
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

  describe('All known text resource files should validate against the text resource schema', () => {
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

    const ajv = new Ajv();
    const validate = ajv.compile(textResourcesSchema);

    for (const app of getAllApps(dir)) {
      const folder = `${dir}/${app}/App/config/texts/`;
      if (!fs.existsSync(folder)) {
        continue;
      }
      const resourceFiles = fs.readdirSync(folder);
      for (const resourceFile of resourceFiles) {
        if (!resourceFile.match(/^resource\.[a-z]{2}\.json$/)) {
          continue;
        }
        let resources: any;
        try {
          const content = fs.readFileSync(`${folder}/${resourceFile}`, 'utf-8');
          resources = JSON.parse(content);
        } catch (e) {
          console.error(`Failed to parse ${folder}/${resourceFile}`, e);
          continue;
        }

        it(`${app}/${resourceFile}`, () => {
          validate(resources);
          expect(
            (validate.errors || []).map((err) => {
              const pointer = JsonPointer.compile(err.instancePath);
              const value = pointer.get(resources);
              return { ...err, value };
            }),
          ).toEqual([]);
        });
      }
    }
  });

  describe('All known applicationmetadata files should validate against the applicationmetadata schema', () => {
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

    const ajv = new Ajv();
    const validate = ajv.compile(applicationMetadataSchema);

    for (const app of getAllApps(dir)) {
      const folder = `${dir}/${app}/App/config/applicationmetadata/`;
      if (!fs.existsSync(folder)) {
        continue;
      }
      const resourceFiles = fs.readdirSync(folder);
      for (const resourceFile of resourceFiles) {
        if (!resourceFile.match(/^applicationmetadata\.json$/)) {
          continue;
        }
        let resources: any;
        try {
          const content = fs.readFileSync(`${folder}/${resourceFile}`, 'utf-8');
          resources = JSON.parse(content);
        } catch (e) {
          console.error(`Failed to parse ${folder}/${resourceFile}`, e);
          continue;
        }

        it(`${app}/${resourceFile}`, () => {
          validate(resources);
          expect(
            (validate.errors || []).map((err) => {
              const pointer = JsonPointer.compile(err.instancePath);
              const value = pointer.get(resources);
              return { ...err, value };
            }),
          ).toEqual([]);
        });
      }
    }
  });
});
