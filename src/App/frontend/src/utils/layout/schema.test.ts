import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import JsonPointer from 'jsonpointer';
import fs from 'node:fs';
import path from 'node:path';
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

// Keywords whose values are instance data, not schemas
const dataKeywords = new Set(['default', 'examples', 'enum', 'const']);

function toPointerSegment(key: string) {
  return encodeURIComponent(key.replace(/~/g, '~0').replace(/\//g, '~1'));
}

/**
 * Finds every 'default' keyword in a schema, with a JSON pointer to the (sub)schema it belongs to.
 */
function findDefaults(node: unknown, pointer = '', found: { pointer: string; value: unknown }[] = []) {
  if (!node || typeof node !== 'object') {
    return found;
  }
  if ('default' in node) {
    found.push({ pointer, value: node.default });
  }
  for (const [key, child] of Object.entries(node)) {
    const childPointer = `${pointer}/${toPointerSegment(key)}`;
    if (key === 'properties' && child && typeof child === 'object') {
      // Skip the properties object itself, where a property named 'default' is not the 'default' keyword
      for (const [name, schema] of Object.entries(child)) {
        findDefaults(schema, `${childPointer}/${toPointerSegment(name)}`, found);
      }
    } else if (!dataKeywords.has(key)) {
      findDefaults(child, childPointer, found);
    }
  }
  return found;
}

const frontendRoot = path.join(__dirname, '../../..');

describe('All schemas should be valid', () => {
  const recurse = (dir: string, files: string[] = []) => {
    for (const file of fs.readdirSync(path.join(frontendRoot, dir))) {
      if (fs.lstatSync(path.join(frontendRoot, dir, file)).isDirectory()) {
        recurse(`${dir}/${file}`, files);
        continue;
      }

      if (!file.endsWith('.json')) {
        continue;
      }

      files.push(`${dir}/${file}`);
      it(`${dir}/${file} should be parseable as JSON`, () => {
        const content = fs.readFileSync(path.join(frontendRoot, dir, file), 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();

        const schema = JSON.parse(content);
        const ajv = new Ajv();
        expect(ajv.validateSchema(schema)).toBeTruthy();
      });
    }
    return files;
  };

  // Static schemas live in this package, while generated ones are written to the layout contract package
  // (see src/codegen/run.ts). Together they are what we publish (see scripts/copy-schemas.ts).
  for (const root of ['schemas', '../../common/ts/layout-contract/schemas']) {
    const files = recurse(root);

    // The meta-schema accepts any value for 'default', so it has to be checked against its own schema
    it(`default values in ${root} should be valid according to their own schema`, () => {
      const schemas = files.map((file) => JSON.parse(fs.readFileSync(path.join(frontendRoot, file), 'utf-8')));
      const ajv = new Ajv({ strict: false });
      addFormats(ajv);
      ajv.addSchema(schemas);

      const invalidDefaults = schemas.flatMap((schema) =>
        findDefaults(schema)
          .map(({ pointer, value }) => {
            const validate = ajv.getSchema(`${schema.$id}#${pointer}`);
            return validate?.(value) ? undefined : { schema: schema.$id, pointer, value, errors: validate?.errors };
          })
          .filter((invalidDefault) => invalidDefault !== undefined),
      );

      expect(invalidDefaults).toEqual([]);
    });
  }
});

describe('Layout schema (Do not expect all of these tests to pass)', () => {
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
