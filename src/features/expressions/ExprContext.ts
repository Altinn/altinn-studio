import dot from 'dot-object';

import { ExprRuntimeError, NodeNotFound, NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { prettyErrors } from 'src/features/expressions/prettyErrors';
import type { AttachmentsSelector } from 'src/features/attachments/AttachmentsStorePlugin';
import type { DevToolsHiddenComponents } from 'src/features/devtools/data/types';
import type { EvalExprOptions } from 'src/features/expressions/index';
import type { ExprConfig, Expression, ExprPositionalArgs } from 'src/features/expressions/types';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { NodeOptionsSelector } from 'src/features/options/OptionsStorePlugin';
import type { FormDataRowsSelector, FormDataSelector } from 'src/layout';
import type { ILayoutSettings } from 'src/layout/common.generated';
import type { IApplicationSettings, IAuthContext, IInstanceDataSources, IProcess } from 'src/types/shared';
import type { BaseLayoutNode, LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { Hidden, NodeDataSelector } from 'src/utils/layout/NodesContext';
import type { DataModelTransposeSelector } from 'src/utils/layout/useDataModelBindingTranspose';
import type { NodeFormDataSelector } from 'src/utils/layout/useNodeItem';
import type { NodeTraversalSelectorLax } from 'src/utils/layout/useNodeTraversal';

export interface ExpressionDataSources {
  process?: IProcess;
  instanceDataSources: IInstanceDataSources | null;
  applicationSettings: IApplicationSettings | null;
  formDataSelector: FormDataSelector;
  formDataRowsSelector: FormDataRowsSelector;
  attachmentsSelector: AttachmentsSelector;
  layoutSettings: ILayoutSettings;
  optionsSelector: NodeOptionsSelector;
  authContext: Partial<IAuthContext> | null;
  langToolsSelector: (node: LayoutNode | undefined) => IUseLanguage;
  currentLanguage: string;
  isHiddenSelector: ReturnType<typeof Hidden.useIsHiddenSelector>;
  nodeFormDataSelector: NodeFormDataSelector;
  nodeDataSelector: NodeDataSelector;
  nodeTraversal: NodeTraversalSelectorLax;
  transposeSelector: DataModelTransposeSelector;
  devToolsIsOpen: boolean;
  devToolsHiddenComponents: DevToolsHiddenComponents;
}

export interface PrettyErrorsOptions {
  config?: ExprConfig;
  introText?: string;
}

/**
 * The expression context object is passed around when executing/evaluating an expression, and is
 * a toolbox for expressions to resolve lookups in data sources, getting the current node, etc.
 */
export class ExprContext {
  public path: string[] = [];

  private constructor(
    public expr: Expression,
    public node: LayoutNode | LayoutPage | NodeNotFoundWithoutContext,
    public dataSources: ExpressionDataSources,
    public callbacks: Pick<EvalExprOptions, 'onBeforeFunctionCall' | 'onAfterFunctionCall'>,
    public positionalArguments?: ExprPositionalArgs,
  ) {}

  /**
   * Start a new context with a blank path (i.e. with a pointer at the top-level of an expression)
   */
  public static withBlankPath(
    expr: Expression,
    node: LayoutNode | LayoutPage | NodeNotFoundWithoutContext,
    dataSources: ExpressionDataSources,
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
      window.logError(err);
      return;
    }

    window.logError(this.prettyError(err, options));
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
}
