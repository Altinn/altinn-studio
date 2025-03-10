import { prettyErrors } from 'src/features/expressions/prettyErrors';
import { ValidationErrorMessage } from 'src/features/expressions/validation';
import type { EvaluateExpressionParams } from 'src/features/expressions/index';
import type { ExprConfig, Expression } from 'src/features/expressions/types';

export class ExprRuntimeError extends Error {
  public constructor(
    public expression: Expression,
    public path: string[],
    message: string,
  ) {
    super(message);
  }
}

export class UnknownTargetType extends ExprRuntimeError {
  public constructor(expression: Expression, path: string[], type: string) {
    super(expression, path, `Cannot cast to unknown type '${type}'`);
  }
}

export class UnknownArgType extends ExprRuntimeError {
  public constructor(expression: Expression, path: string[], type: string, supported: string) {
    let paramIdx = 0;
    const params = [supported, type];
    const newMessage = ValidationErrorMessage.ArgWrongType.replaceAll('%s', () => params[paramIdx++]);
    super(expression, path, newMessage);
  }
}

export class UnexpectedType extends ExprRuntimeError {
  public constructor(expression: Expression, path: string[], expected: string, actual: unknown) {
    super(expression, path, `Expected ${expected}, got value ${JSON.stringify(actual)}`);
  }
}

export class NodeRelationNotFound extends ExprRuntimeError {
  public constructor(ctx: EvaluateExpressionParams, id: string) {
    const ref = ctx.reference;
    const ourLocation =
      ref.type === 'node' ? `component ${ref.id}` : ref.type === 'page' ? `page ${ref.id}` : 'unknown';
    super(
      ctx.expr,
      ctx.path,
      `Component ${id} was found, but it is inside a repeating structure. Cannot find an instance ` +
        `of it that is a sibling or parent in relation to ${ourLocation}`,
    );
  }
}

export interface PrettyErrorsOptions {
  config?: ExprConfig;
  introText?: string;
}

/**
 * Create a string representation of the full expression, using the path pointer to point out where the expression
 * failed (with a message).
 */
export function traceExpressionError(err: Error, expr: Expression, path: string[], options?: PrettyErrorsOptions) {
  if (!(err instanceof ExprRuntimeError)) {
    window.logError(err);
    return;
  }

  window.logError(prettyError(err, expr, path, options));
}

export function prettyError(err: Error, expr: Expression, path: string[], options?: PrettyErrorsOptions): string {
  if (err instanceof ExprRuntimeError) {
    const prettyPrinted = prettyErrors({
      input: expr,
      errors: { [path.join('')]: [err.message] },
      indentation: 1,
    });

    const introText = options && 'introText' in options ? options.introText : 'Evaluated expression';

    const extra = options && options.config ? ['Using default value instead:', `  ${options.config.defaultValue}`] : [];

    return [`${introText}:`, prettyPrinted, ...extra].join('\n');
  }

  return err.message;
}
