const fs = require('fs');
const ts = require('ts-morph');
const path = require('path');
const { glob } = require('glob');

const getTsSourceFile = (file) => {
  const project = new ts.Project();
  return project.createSourceFile('dummy.ts', fs.readFileSync(path.join(__dirname, file), 'utf8'));
};

const getFileImports = (project, file) => {
  const output = [];
  project.getImportDeclarations().forEach((importDecl) => {
    const rawModule = importDecl.getModuleSpecifier().getLiteralText();
    const module = rawModule.startsWith('.')
      ? path.resolve(path.dirname(file), rawModule)
      : rawModule;
    const defaultimport = importDecl.getDefaultImport();
    if (defaultimport) {
      output.push({
        file,
        module,
        name: defaultimport.getText(),
        default: true,
      });
    }
    importDecl.getNamedImports().forEach((imp) => {
      output.push({
        file,
        module,
        name: imp.getName(),
        default: false,
      });
    });
  });
  return output;
};

const writeToFile = async () => {
  const statsStream = fs.createWriteStream('stats.csv');
  const files = await glob(`${__dirname}/**/*.ts*`, { ignore: 'node_modules/**' });
  statsStream.write(`${['file', 'module', 'name', 'default'].join(';')}\r\n`);
  files.forEach((file) => {
    if (!file.includes('node_modules')) {
      const shortFilename = file.substring(__dirname.length);
      const tsSourceFile = getTsSourceFile(shortFilename);
      getFileImports(tsSourceFile, shortFilename).forEach((stat) => {
        statsStream.write(`${Object.values(stat).join(';')}\r\n`);
      });
    }
  });
  statsStream.end();
};

writeToFile().then(() => console.log('Done collecting stats'));
//const fileHasDefaultExport = (project) => project.getDefaultExportSymbol() !== undefined;
//console.log(fileHasDefaultExport('app-development/config/routes.tsx'));
//console.log(fileHasDefaultExport('packages/shared/src/components/AltinnPopper.tsx'));
