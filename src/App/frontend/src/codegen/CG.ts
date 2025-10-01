import { ComponentConfig } from 'src/codegen/ComponentConfig';
import { GenerateArray } from 'src/codegen/dataTypes/GenerateArray';
import { GenerateBoolean } from 'src/codegen/dataTypes/GenerateBoolean';
import { GenerateCommonImport } from 'src/codegen/dataTypes/GenerateCommonImport';
import { GenerateConst } from 'src/codegen/dataTypes/GenerateConst';
import { GenerateDataModelBinding } from 'src/codegen/dataTypes/GenerateDataModelBinding';
import { GenerateEnum } from 'src/codegen/dataTypes/GenerateEnum';
import { GenerateExpressionOr } from 'src/codegen/dataTypes/GenerateExpressionOr';
import { GenerateImportedSymbol } from 'src/codegen/dataTypes/GenerateImportedSymbol';
import { GenerateInteger } from 'src/codegen/dataTypes/GenerateInteger';
import { GenerateIntersection } from 'src/codegen/dataTypes/GenerateIntersection';
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

export const CG = {
  component: ComponentConfig,

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
  dataModelBinding: GenerateDataModelBinding,

  // Known values that we have types for elsewhere, or other imported types
  common: generateCommonImport,
  import: GenerateImportedSymbol,

  // Others
  enum: GenerateEnum,
  union: GenerateUnion,
  intersection: GenerateIntersection,
  raw: GenerateRaw,
};
