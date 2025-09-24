import type { JSONSchema7 } from 'json-schema';

import { CG } from 'src/codegen/CG';
import { MaybeOptionalCodeGenerator } from 'src/codegen/CodeGenerator';
import { CodeGeneratorContext } from 'src/codegen/CodeGeneratorContext';
import type { SerializableSetting } from 'src/codegen/SerializableSetting';

export interface ImportDef {
  import: string;
  from: string;
}

/**
 * Generates a plain import statement in TypeScript. Beware that if you use this in code generating a JsonSchema,
 * your code will fail (JsonSchema only supports imports from the definitions, i.e. 'common' imports).
 */
export class GenerateImportedSymbol<T> extends MaybeOptionalCodeGenerator<T> implements SerializableSetting {
  public constructor(private readonly val: ImportDef) {
    super();
  }

  serializeToTypeDefinition(): string {
    return `${this}`;
  }

  serializeToTypeScript(): string {
    const _CG = new CG.import({
      import: 'CG',
      from: 'src/codegen/CG',
    });
    return `new ${_CG}.import<${this}>({
      import: ${JSON.stringify(this.val.import)},
      from: ${JSON.stringify(this.val.from)},
    })`;
  }

  toTypeScriptDefinition(symbol: string | undefined): string {
    if (symbol && symbol === this.val.import) {
      throw new Error('Do not re-define imported symbols');
    }

    CodeGeneratorContext.curFile().addImport(this.val.import, this.val.from);
    return symbol ? `type ${symbol} = ${this.val.import};` : this.val.import;
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    throw new Error(`Cannot generate JsonSchema for imported '${this.val.import}'`);
  }
}
