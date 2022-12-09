import dot from 'dot-object';

import { ExprRuntimeError, NodeNotFound, NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { prettyErrors, prettyErrorsToConsole } from 'src/features/expressions/prettyErrors';
import type { Expression } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/form/data';
import type { LayoutNode, LayoutRootNode } from 'src/utils/layout/hierarchy';

import type { IApplicationSettings, IInstanceContext } from 'src/types/shared';

export interface ContextDataSources {
  instanceContext: IInstanceContext | null;
  applicationSettings: IApplicationSettings | null;
  formData: IFormData;
  hiddenFields: Set<string>;
}

export interface PrettyErrorsOptions {
  defaultValue?: any;
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
    public node: LayoutNode<any> | LayoutRootNode<any> | NodeNotFoundWithoutContext,
    public dataSources: ContextDataSources,
  ) {}

  /**
   * Start a new context with a blank path (i.e. with a pointer at the top-level of an expression)
   */
  public static withBlankPath(
    expr: Expression,
    node: LayoutNode<any> | LayoutRootNode<any> | NodeNotFoundWithoutContext,
    dataSources: ContextDataSources,
  ): ExprContext {
    return new ExprContext(expr, node, dataSources);
  }

  /**
   * Reference a previous instance, but move our path pointer to a new path (meaning the context is working on an
   * inner part of the expression)
   */
  public static withPath(prevInstance: ExprContext, newPath: string[]) {
    const newInstance = new ExprContext(prevInstance.expr, prevInstance.node, prevInstance.dataSources);
    newInstance.path = newPath;

    return newInstance;
  }

  /**
   * Utility function used to get the LayoutNode for this context, or fail if the node was not found
   */
  public failWithoutNode(): LayoutNode<any> | LayoutRootNode<any> {
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
        options && 'defaultValue' in options ? ['Using default value instead:', `  ${options.defaultValue}`] : [];

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
        options && 'defaultValue' in options ? `\n%cUsing default value instead:\n  %c${options.defaultValue}%c` : '';
      const extraCss = options && 'defaultValue' in options ? ['', 'color: red;', ''] : [];

      return [`${introText}:\n${prettyPrinted.lines}${extra}`, ...prettyPrinted.css, ...extraCss];
    }

    return [err.message];
  }
}
