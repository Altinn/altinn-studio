import deepEqual from 'fast-deep-equal';
import type { JSONSchema7 } from 'json-schema';

import type { MaybeSymbolizedCodeGenerator } from 'src/codegen/CodeGenerator';

/**
 * This code relies on the fact that the code generator will generate one file at a time, and reset the context
 * between each file. This means that we can use a global variable to store the context, and use this context
 * to store information about the current file being generated (such as imports, etc).
 */
export class CodeGeneratorContext {
  private static fileInstance: CodeGeneratorFileContext<any> | undefined;

  public static curFile(): CodeGeneratorFileContext<any> {
    if (!this.fileInstance) {
      throw new Error(
        'CodeGeneratorFileContext has not been initialized, run this in code that is called ' +
          'within CodeGeneratorContext.generateFile(), such as a CodeGenerator.toTypeScript() method',
      );
    }

    return this.fileInstance;
  }

  public static async generateTypeScript(
    targetFile: string,
    fn: () => string | Promise<string>,
  ): Promise<{ result: string }> {
    const instance = new CodeGeneratorFileContext(targetFile, 'typeScript');
    CodeGeneratorContext.fileInstance = instance;
    const functionOutput = await fn();
    const parts: string[] = [];
    const symbols: SymbolTable<'typeScript'> = {};
    while (Object.keys(instance.symbols).length) {
      const newSymbols = instance.getSymbols(symbols);
      Object.assign(symbols, newSymbols);
    }

    // Sort symbols and add them in sorted order to the file
    const sortedSymbols = Object.keys(symbols).sort();
    for (const symbol of sortedSymbols) {
      parts.push(symbols[symbol]);
    }

    while (Object.keys(instance.imports).length) {
      parts.unshift(instance.getImportsAsTypeScript());
    }

    if (functionOutput) {
      parts.push(functionOutput);
    }

    CodeGeneratorContext.fileInstance = undefined;

    return { result: parts.join('\n\n') };
  }

  public static async generateJsonSchema(
    targetFile: string,
    fn: () => JSONSchema7 | Promise<JSONSchema7>,
  ): Promise<{ result: JSONSchema7 }> {
    const instance = new CodeGeneratorFileContext(targetFile, 'jsonSchema');
    CodeGeneratorContext.fileInstance = instance;
    const functionOutput = await fn();
    const symbols: SymbolTable<'jsonSchema'> = {};
    while (Object.keys(instance.symbols).length) {
      const newSymbols = instance.getSymbols(symbols);
      Object.assign(symbols, newSymbols);
    }

    // Sort symbols and add them in sorted order to the file
    const sortedSymbols = Object.keys(symbols).sort();
    for (const symbol of sortedSymbols) {
      functionOutput.definitions = functionOutput.definitions || {};
      functionOutput.definitions[symbol] = symbols[symbol];
    }

    //   const foundRefs = new Set<string>();
    //   const allRefs = new Set<string>(Object.keys(schemaDefs));
    //   for (const value of Object.values(schemaDefs)) {
    //     const asJson = JSON.stringify(value);
    //     const refRegex = /"\$ref":\s*"([^"]+)"/g;
    //     const refMatches = asJson.match(refRegex);
    //     if (refMatches) {
    //       for (const ref of refMatches) {
    //         const result = ref.replace('"$ref":', '').replace(/"/g, '').trim().replace('#/definitions/', '');
    //         foundRefs.add(result);
    //       }
    //       // foundRefs.add(refMatches[1].replace('#/definitions/', ''));
    //     } else if (asJson.includes('$ref')) {
    //       throw new Error(`Could not find ref in ${asJson}`);
    //     }
    //   }
    //
    //   const notFoundRefs = [...allRefs].filter((ref) => !foundRefs.has(ref));
    //   const notFoundExceptComponents = notFoundRefs.filter((ref) => !ref.startsWith('Comp'));
    //   const finalSchemaDefs = structuredClone(schemaDefs);
    //   for (const key of notFoundExceptComponents) {
    //     delete finalSchemaDefs[key];
    //   }

    CodeGeneratorContext.fileInstance = undefined;

    return {
      result: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $id: `https://altinncdn.no/${targetFile}`,
        ...functionOutput,
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

    const set = this.imports[from] as Set<string>;
    set.add(symbol);
  }

  public addSymbol(name: string, exported: boolean, generator: MaybeSymbolizedCodeGenerator<any>) {
    const prefix = exported ? 'export ' : '';
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
      const symbols = Array.from(this.imports[fileName]).sort();
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
