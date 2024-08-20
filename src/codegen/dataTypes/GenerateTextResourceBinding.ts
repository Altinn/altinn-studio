import { CG } from 'src/codegen/CG';
import { GenerateProperty } from 'src/codegen/dataTypes/GenerateProperty';
import { ExprVal } from 'src/features/expressions/types';
import type { GenerateExpressionOr } from 'src/codegen/dataTypes/GenerateExpressionOr';

export interface TextResourceConfig {
  name: string;
  title: string;
  description: string;
}

/**
 * Generates a text resource binding property. This is just a regular property, but this class is used as a
 * helper to make sure you always provide a description and title, and never specify the inner type yourself.
 */
export class GenerateTextResourceBinding extends GenerateProperty<GenerateExpressionOr<ExprVal.String>> {
  constructor(config: TextResourceConfig) {
    const actualProp = new CG.expr(ExprVal.String).optional().setTitle(config.title).setDescription(config.description);
    super(config.name, actualProp);
  }
}
