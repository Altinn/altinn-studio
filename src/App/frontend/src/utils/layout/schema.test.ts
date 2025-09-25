import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import JsonPointer from 'jsonpointer';
import fs from 'node:fs';
import applicationMetadataSchema from 'schemas/json/application/application-metadata.schema.v1.json';
import textResourcesSchema from 'schemas/json/text-resources/text-resources.schema.v1.json';
import type { ErrorObject } from 'ajv';

import { ensureAppsDirIsSet, getAllApps } from 'src/test/allApps';

function withValues(targetObject: object) {
  return (err: ErrorObject) => {
    const pointer = JsonPointer.compile(err.instancePath);
    const value = pointer.get(targetObject);
    return { ...err, value };
  };
}

describe('Layout schema (Do not expect all of these tests to pass)', () => {
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

  describe('All known text resource files should validate against the text resource schema', () => {
    const dir = ensureAppsDirIsSet();
    if (!dir) {
      return;
    }

    const ajv = new Ajv();
    const validate = ajv.compile(textResourcesSchema);

    for (const app of getAllApps(dir)) {
      for (const resources of app.getTextResources()) {
        it(`${app.getName()}/${resources.language}`, () => {
          validate(resources);
          expect((validate.errors || []).map(withValues(resources))).toEqual([]);
        });
      }
    }
  });

  describe('All known applicationmetadata files should validate against the applicationmetadata schema', () => {
    const dir = ensureAppsDirIsSet();
    if (!dir) {
      return;
    }

    const ajv = new Ajv();
    addFormats(ajv);
    const validate = ajv.compile(applicationMetadataSchema);

    for (const app of getAllApps(dir)) {
      it(app.getName(), () => {
        const metadata = app.getAppMetadata();
        validate(metadata);
        expect((validate.errors || []).map(withValues(metadata))).toEqual([]);
      });
    }
  });
});
