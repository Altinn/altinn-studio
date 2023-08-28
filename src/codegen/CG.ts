import { ComponentConfig } from 'src/codegen/ComponentConfig';
import { GenerateArray } from 'src/codegen/dataTypes/GenerateArray';
import { GenerateBoolean } from 'src/codegen/dataTypes/GenerateBoolean';
import { GenerateCommonImport } from 'src/codegen/dataTypes/GenerateCommonImport';
import { GenerateComponentLike } from 'src/codegen/dataTypes/GenerateComponentLike';
import { GenerateConst } from 'src/codegen/dataTypes/GenerateConst';
import { GenerateEnum } from 'src/codegen/dataTypes/GenerateEnum';
import { GenerateExpressionOr } from 'src/codegen/dataTypes/GenerateExpressionOr';
import { GenerateImportedSymbol } from 'src/codegen/dataTypes/GenerateImportedSymbol';
import { GenerateInteger } from 'src/codegen/dataTypes/GenerateInteger';
import { GenerateIntersection } from 'src/codegen/dataTypes/GenerateIntersection';
import { GenerateLinked } from 'src/codegen/dataTypes/GenerateLinked';
import { GenerateNumber } from 'src/codegen/dataTypes/GenerateNumber';
import { GenerateObject } from 'src/codegen/dataTypes/GenerateObject';
import { GenerateProperty } from 'src/codegen/dataTypes/GenerateProperty';
import { GenerateRaw } from 'src/codegen/dataTypes/GenerateRaw';
import { GenerateString } from 'src/codegen/dataTypes/GenerateString';
import { GenerateTextResourceBinding } from 'src/codegen/dataTypes/GenerateTextResourceBinding';
import { GenerateUnion } from 'src/codegen/dataTypes/GenerateUnion';
import type { ValidCommonKeys } from 'src/codegen/Common';

function generateCommonImport<T extends ValidCommonKeys>(key: T): GenerateCommonImport<T> {
  return new GenerateCommonImport(key);
}

/**
 * The code generator can transform defined types into multiple 'variants' of code. For example, an external variant
 * of a configuration may contain an expression that should be evaluated, but our internal types however would just
 * contain the result of the expression evaluation. All configuration of components are processed into internal
 * types before being used in most of our internal code, and these processors include (but are not limited to) the
 * hierarchy generator, LayoutNode (etc), and the expression evaluator engine.
 *
 * @see generateHierarchy
 */
export enum Variant {
  Internal = 'internal',
  External = 'external',
}

/**
 * When the code generator sees types that include expressions or other types that differs between the internal and
 * external variants, it will generate separate types for each variant (in our TypeScript outputs). These types are
 * suffixed with these strings. In JsonSchema, only the external variant is generated, and so there are no suffixes.
 */
export const VariantSuffixes: { [variant in Variant]: string } = {
  [Variant.Internal]: 'Internal',
  [Variant.External]: 'External',
};

export const CG = {
  component: ComponentConfig,
  componentLike: GenerateComponentLike,

  // Scalars, types and expressions
  const: GenerateConst,
  expr: GenerateExpressionOr,
  str: GenerateString,
  bool: GenerateBoolean,
  int: GenerateInteger,
  num: GenerateNumber,
  arr: GenerateArray,

  // Shortcuts for common constant values
  null: new GenerateConst(null),
  true: new GenerateConst(true),
  false: new GenerateConst(false),

  // Objects and properties
  obj: GenerateObject,
  prop: GenerateProperty,
  trb: GenerateTextResourceBinding,

  // Known values that we have types for elsewhere, or other imported types
  common: generateCommonImport,
  import: GenerateImportedSymbol,
  layoutNode: new GenerateImportedSymbol({
    import: 'LayoutNode',
    from: 'src/utils/layout/LayoutNode',
  }),
  baseLayoutNode: new GenerateImportedSymbol({
    import: 'BaseLayoutNode',
    from: 'src/utils/layout/LayoutNode',
  }),

  // Others
  enum: GenerateEnum,
  union: GenerateUnion,
  intersection: GenerateIntersection,
  linked: GenerateLinked,
  raw: GenerateRaw,
};
