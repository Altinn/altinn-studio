import dot from 'dot-object';

import { ExprRuntimeError, NodeNotFound, NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { prettyErrors, prettyErrorsToConsole } from 'src/features/expressions/prettyErrors';
import type { IAttachments } from 'src/features/attachments';
import type { EvalExprOptions } from 'src/features/expressions/index';
import type { ExprConfig, Expression, ExprPositionalArgs } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/formData';
import type { AllOptionsMap } from 'src/features/options/useAllOptions';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IUiConfig } from 'src/types';
import type { IApplicationSettings, IAuthContext, IInstanceContext } from 'src/types/shared';
import type { BaseLayoutNode, LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

export interface ContextDataSources {
  instanceContext: IInstanceContext | null;
  applicationSettings: IApplicationSettings | null;
  formData: IFormData;
  attachments: IAttachments;
  uiConfig: IUiConfig;
  options: AllOptionsMap;
  authContext: Partial<IAuthContext> | null;
  hiddenFields: Set<string>;
  langTools: IUseLanguage;
}

export interface PrettyErrorsOptions {
  config?: ExprConfig;
  introText?: string;
}

/**
 * The expression context object is passed around when executing/evaluating a expression, and is
 * a toolbox for expressions to resolve lookups in data sources, getting the current node, etc.
 */
export class ExprContext {
  public path: string[] = [];

  private constructor(
    public expr: Expression,
    public node: LayoutNode | LayoutPage | NodeNotFoundWithoutContext,
    public dataSources: ContextDataSources,
    public callbacks: Pick<EvalExprOptions, 'onBeforeFunctionCall' | 'onAfterFunctionCall'>,
    public positionalArguments?: ExprPositionalArgs,
  ) {}

  /**
   * Start a new context with a blank path (i.e. with a pointer at the top-level of an expression)
   */
  public static withBlankPath(
    expr: Expression,
    node: LayoutNode | LayoutPage | NodeNotFoundWithoutContext,
    dataSources: ContextDataSources,
    callbacks: Pick<EvalExprOptions, 'onBeforeFunctionCall' | 'onAfterFunctionCall'>,
    positionalArguments?: ExprPositionalArgs,
  ): ExprContext {
    return new ExprContext(expr, node, dataSources, callbacks, positionalArguments);
  }

  /**
   * Reference a previous instance, but move our path pointer to a new path (meaning the context is working on an
   * inner part of the expression)
   */
  public static withPath(prevInstance: ExprContext, newPath: string[]) {
    const newInstance = new ExprContext(
      prevInstance.expr,
      prevInstance.node,
      prevInstance.dataSources,
      prevInstance.callbacks,
      prevInstance.positionalArguments,
    );
    newInstance.path = newPath;

    return newInstance;
  }

  /**
   * Utility function used to get the LayoutNode for this context, or fail if the node was not found
   */
  public failWithoutNode(): LayoutNode | BaseLayoutNode | LayoutPage {
    if (this.node instanceof NodeNotFoundWithoutContext) {
      throw new NodeNotFound(this, this.node);
    }
    return this.node;
  }

  /**
   * Get the expression for the current path
   */
  public getExpr(): Expression {
    if (this.path.length === 0) {
      return this.expr;
    }

    // For some reason dot.pick wants to use the format '0[1][2]' for arrays instead of '[0][1][2]', so we'll rewrite
    const [firstKey, ...restKeys] = this.path;
    const stringPath = firstKey.replace('[', '').replace(']', '') + restKeys.join('');

    return dot.pick(stringPath, this.expr, false);
  }

  /**
   * Create a string representation of the full expression, using the path pointer to point out where the expression
   * failed (with a message).
   */
  public trace(err: Error, options?: PrettyErrorsOptions) {
    if (!(err instanceof ExprRuntimeError)) {
      console.error(err);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(...this.prettyErrorConsole(err, options));
  }

  public prettyError(err: Error, options?: PrettyErrorsOptions): string {
    if (err instanceof ExprRuntimeError) {
      const prettyPrinted = prettyErrors({
        input: this.expr,
        errors: { [this.path.join('')]: [err.message] },
        indentation: 1,
      });

      const introText = options && 'introText' in options ? options.introText : 'Evaluated expression';

      const extra =
        options && options.config ? ['Using default value instead:', `  ${options.config.defaultValue}`] : [];

      return [`${introText}:`, prettyPrinted, ...extra].join('\n');
    }

    return err.message;
  }

  public prettyErrorConsole(err: Error, options?: PrettyErrorsOptions): string[] {
    if (err instanceof ExprRuntimeError) {
      const prettyPrinted = prettyErrorsToConsole({
        input: this.expr,
        errors: { [this.path.join('')]: [err.message] },
        indentation: 1,
        defaultStyle: '',
      });

      const introText = options && 'introText' in options ? options.introText : 'Evaluated expression:';

      const extra =
        options && options.config ? `\n%cUsing default value instead:\n  %c${options.config.defaultValue}%c` : '';
      const extraCss = options && options.config ? ['', 'color: red;', ''] : [];

      return [`${introText}:\n${prettyPrinted.lines}${extra}`, ...prettyPrinted.css, ...extraCss];
    }

    return [err.message];
  }
}
