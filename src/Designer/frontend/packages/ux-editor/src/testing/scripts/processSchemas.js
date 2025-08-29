const fs = require('fs');

const componentSchemaDirPath = `${__dirname}/../schemas/json/component`;
const layoutSchemaDirPath = `${__dirname}/../schemas/json/layout`;

const ensureDraft07Keywords = (schemaString) => {
  return schemaString
    .replaceAll('$defs', 'definitions')
    .replace(
      'https://json-schema.org/draft/2020-12/schema',
      'http://json-schema.org/draft-07/schema#',
    );
};

const ensureFullyQualifiedRefs = (schemaString) => {
  return schemaString
    .replaceAll('"common-defs', '"https://altinncdn.no/schemas/json/component/common-defs')
    .replaceAll('"../layout', '"https://altinncdn.no/schemas/json/layout');
};

const processSchemaFiles = (folderPath) => {
  const files = fs.readdirSync(folderPath);
  files.forEach((file) => {
    const fileRaw = fs.readFileSync(`${folderPath}/${file}`);
    const fileStr = fileRaw.toString();
    let newFileStr = ensureDraft07Keywords(fileStr);
    newFileStr = ensureFullyQualifiedRefs(newFileStr);
    fs.writeFileSync(`${folderPath}/${file}`, newFileStr);
  });
};

const run = () => {
  processSchemaFiles(componentSchemaDirPath);
  processSchemaFiles(layoutSchemaDirPath);
};

run();
