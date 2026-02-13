import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Strips the UTF-8 BOM from the OpenAPI spec file.
 * The backend's verified snapshot includes a BOM that Orval cannot parse.
 * This copies the file without the BOM to a local location for Orval to consume.
 */

const source = resolve(
  __dirname,
  '../../../backend/test/Altinn.App.Api.Tests/OpenApi/OpenApiSpecChangeDetection.SaveJsonSwagger.verified.json',
);
const dest = resolve(__dirname, 'generated/openapi-spec.json');

let content = readFileSync(source, 'utf-8');

// Strip BOM if present
if (content.charCodeAt(0) === 0xfeff) {
  content = content.slice(1);
}

writeFileSync(dest, content);
