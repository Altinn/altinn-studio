import deepEqual from 'fast-deep-equal';
import type { JSONSchema7 } from 'json-schema';

import type { MaybeSymbolizedCodeGenerator } from 'src/codegen/CodeGenerator';
import type { SchemaFile } from 'src/codegen/SchemaFile';

type JsonSchema7WithDefinitions = Required<Pick<JSONSchema7, 'definitions'>> & JSONSchema7;

/**
 * This code relies on the fact that the code generator will generate one file at a time, and reset the context
 * between each file. This means that we can use a global variable to store the context, and use this context
 * to store information about the current file being generated (such as imports, etc).
 */
export class CodeGeneratorContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static fileContext: CodeGeneratorFileContext<any> | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static curFile(): CodeGeneratorFileContext<any> {
    if (!this.fileContext) {
      throw new Error(
        'CodeGeneratorFileContext has not been initialized, run this in code that is called ' +
          'within CodeGeneratorContext.generateFile(), such as a CodeGenerator.toTypeScript() method',
      );
    }

    return this.fileContext;
  }

  public static async generateTypeScript(
    targetFile: string,
    fn: () => string | Promise<string>,
  ): Promise<{ result: string }> {
    const instance = new CodeGeneratorFileContext(targetFile, 'typeScript');
    CodeGeneratorContext.fileContext = instance;
    const functionOutput = await fn();
    const parts: string[] = [];
    const symbols: SymbolTable<'typeScript'> = {};
    while (Object.keys(instance.symbols).length) {
      const newSymbols = instance.getSymbols(symbols);
      Object.assign(symbols, newSymbols);
    }

    // Sort symbols and add them in sorted order to the file
    const sortedSymbols = Object.keys(symbols).sort((a, b) => a.localeCompare(b));
    for (const symbol of sortedSymbols) {
      parts.push(symbols[symbol]);
    }

    while (Object.keys(instance.imports).length) {
      parts.unshift(instance.getImportsAsTypeScript());
    }

    if (functionOutput) {
      parts.push(functionOutput);
    }

    CodeGeneratorContext.fileContext = undefined;

    return { result: parts.join('\n\n') };
  }

  private static findRefs(jsonSchema: JsonSchema7WithDefinitions): Set<string> {
    const { definitions, ...jsonSchemaWithoutDefs } = jsonSchema;
    const refRegex = /"\$ref":\s*"([^"]+)"/g;
    const foundRefs = new Set<string>();

    for (const definition of [...Object.values(definitions), jsonSchemaWithoutDefs]) {
      const jsonDefinition = JSON.stringify(definition);
      const refMatches = jsonDefinition.match(refRegex);
      if (refMatches) {
        for (const ref of refMatches) {
          const result = ref.replace('"$ref":', '').replace(/"/g, '').trim().replace('#/definitions/', '');
          foundRefs.add(result);
        }
      } else if (jsonDefinition.includes('$ref')) {
        throw new Error(`Could not find ref in ${jsonDefinition}`);
      }
    }

    return foundRefs;
  }

  private static cleanDefinitions(jsonSchema: JsonSchema7WithDefinitions): NonNullable<JSONSchema7['definitions']> {
    let removedLastRound: number | undefined = undefined;
    const { definitions: originalDefinitions, ...rest } = jsonSchema;
    let cleanedDefinitions = { ...originalDefinitions };

    while (removedLastRound === undefined || removedLastRound > 0) {
      const foundRefs = this.findRefs({ ...rest, definitions: cleanedDefinitions });
      const allRefs = new Set<string>(Object.keys(cleanedDefinitions));
      const notFoundRefs = [...allRefs].filter((ref) => !foundRefs.has(ref));

      const finalSchemaDefs = structuredClone(cleanedDefinitions);
      removedLastRound = 0;
      for (const key of notFoundRefs) {
        delete finalSchemaDefs[key];
        removedLastRound++;
      }

      cleanedDefinitions = finalSchemaDefs;
    }
    return cleanedDefinitions;
  }

  public static async generateJsonSchema(baseFilePath: string, file: SchemaFile): Promise<{ result: JSONSchema7 }> {
    const targetFile = baseFilePath + file.getFileName();
    const jsonSchemaFileContext = new CodeGeneratorFileContext(targetFile, 'jsonSchema');
    CodeGeneratorContext.fileContext = jsonSchemaFileContext;
    const jsonSchema = await file.getSchema();

    const symbols: SymbolTable<'jsonSchema'> = {};
    while (Object.keys(jsonSchemaFileContext.symbols).length) {
      const newSymbols = jsonSchemaFileContext.getSymbols(symbols);
      Object.assign(symbols, newSymbols);
    }

    // Sort symbols and add them in sorted order to the file
    const sortedSymbols = Object.keys(symbols).sort((a, b) => a.localeCompare(b));
    for (const symbol of sortedSymbols) {
      jsonSchema.definitions = jsonSchema.definitions ?? {};
      jsonSchema.definitions[symbol] = symbols[symbol];
    }

    if (file.shouldCleanDefinitions() && jsonSchema.definitions) {
      jsonSchema.definitions = this.cleanDefinitions({ ...jsonSchema, definitions: jsonSchema.definitions });
    }

    CodeGeneratorContext.fileContext = undefined;

    return {
      result: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $id: `https://altinncdn.no/${targetFile}`,
        ...jsonSchema,
      },
    };
  }
}

type FileType = 'jsonSchema' | 'typeScript';
type Imports = { [fileName: string]: Set<string> };
type SymbolTable<T extends FileType> = { [symbol: string]: T extends 'jsonSchema' ? JSONSchema7 : string };

export class CodeGeneratorFileContext<T extends FileType> {
  private readonly targetFile: string;
  private readonly type: T;
  public symbols: SymbolTable<T> = {};
  public imports: Imports = {};

  constructor(targetFile: string, type: T) {
    this.targetFile = targetFile.replace(/\.ts$/, '');
    this.type = type;
  }

  public addImport(symbol: string, from: string): void {
    if (this.type === 'jsonSchema') {
      throw new Error('Cannot add imports to a jsonSchema file');
    }

    if (from === this.targetFile) {
      return;
    }

    if (!this.imports[from]) {
      this.imports[from] = new Set();
    }

    const set: Set<string> = this.imports[from];
    set.add(symbol);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public addSymbol(name: string, exported: boolean, generator: MaybeSymbolizedCodeGenerator<any>) {
    const comment = generator.internal.typeScript.comment
      ? `/**\n * ${generator.internal.typeScript.comment.split('\n').join('\n * ')}\n */\n`
      : '';

    const prefix = exported ? `${comment}export ` : comment;
    if (this.type === 'typeScript') {
      const tsDefinition = prefix + generator.toTypeScriptDefinition(name);
      if (this.symbols[name] && this.symbols[name] !== tsDefinition) {
        throw new Error(`TypeScript symbol ${name} already exists, and is not equal to the new symbol`);
      }
      (this.symbols as SymbolTable<'typeScript'>)[name] = tsDefinition;
    } else if (this.type === 'jsonSchema') {
      const jsonSchemaDefinition = generator.toJsonSchemaDefinition();
      if (this.symbols[name] && !deepEqual(this.symbols[name], jsonSchemaDefinition)) {
        throw new Error(`JsonSchema symbol ${name} already exists, and is not equal to the new symbol`);
      }
      (this.symbols as SymbolTable<'jsonSchema'>)[name] = jsonSchemaDefinition;
    } else {
      throw new Error(`Unknown file type ${this.type}`);
    }
  }

  getImportsAsTypeScript(): string {
    const importLines = Object.keys(this.imports).map((fileName) => {
      const symbols = Array.from(this.imports[fileName]).sort((a, b) => a.localeCompare(b));
      return `import { ${symbols.join(', ')} } from '${fileName}';`;
    });

    this.imports = {};
    return importLines.join('\n');
  }

  getSymbols(ifNotIn: SymbolTable<T>): SymbolTable<T> {
    const out: SymbolTable<T> = {};

    for (const name of Object.keys(this.symbols)) {
      if (ifNotIn[name]) {
        continue;
      }
      out[name] = this.symbols[name];
    }

    this.symbols = {};
    return out;
  }
}
