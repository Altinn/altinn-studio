import React from 'react';

import { SummaryItemCompact } from 'src/components/summary/SummaryItemCompact';
import { ComponentType } from 'src/layout/index';
import type { ISummaryComponent } from 'src/components/summary/SummaryComponent';
import type { PropsFromGenericComponent } from 'src/layout/index';
import type { ComponentTypes } from 'src/layout/layout';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

abstract class AnyComponent<Type extends ComponentTypes> {
  /**
   * Given properties from GenericComponent, render this layout component
   */
  abstract render(props: PropsFromGenericComponent<Type>): JSX.Element | null;

  /**
   * Direct render? Override this and return true if you want GenericComponent to omit rendering grid,
   * validation messages, etc.
   */
  directRender(_props: PropsFromGenericComponent<Type>): boolean {
    return false;
  }

  /**
   * Return false to render this component without the label (in GenericComponent.tsx)
   */
  renderWithLabel(): boolean {
    return true;
  }

  /**
   * Should GenericComponent render validation messages for simpleBinding outside of this component?
   * This has no effect if:
   *  - Your component renders directly, using directRender()
   *  - Your component uses a different data binding (you should handle validations yourself)
   */
  renderDefaultValidations(): boolean {
    return true;
  }

  /**
   * Is this a form component that has formData and should be displayed differently in summary/pdf?
   * Purely presentational components with no interaction should override and return ComponentType.Presentation.
   */
  abstract getComponentType(): ComponentType;
}

export abstract class PresentationComponent<Type extends ComponentTypes> extends AnyComponent<Type> {
  readonly getComponentType = (): ComponentType => {
    return ComponentType.Presentation;
  };
}

export interface SummaryRendererProps<Type extends ComponentTypes> {
  summaryNode: LayoutNodeFromType<'Summary'>;
  targetNode: LayoutNodeFromType<Type>;
  onChangeClick: () => void;
  changeText: string | null;
  overrides?: ISummaryComponent['overrides'];
}

export abstract class FormComponent<Type extends ComponentTypes> extends AnyComponent<Type> {
  readonly getComponentType = (): ComponentType => {
    return ComponentType.Form;
  };

  /**
   * Given a node (with group-index-aware data model bindings), this method should return a proper 'value' for the
   * current component/node. This value will be used to display form data in a repeating group table, and when rendering
   * a Summary for the node inside a repeating group. It will probably also be useful when implementing renderSummary().
   * @see renderSummary
   * @see renderCompactSummary
   */
  abstract useDisplayData(node: LayoutNodeFromType<Type>): string;

  /**
   * Render a summary for this component. For most components, this will return a:
   * <SingleInputSummary formDataAsString={displayData} />
   */
  abstract renderSummary(props: SummaryRendererProps<Type>): JSX.Element | null;

  /**
   * Lets you control if the component renders something like <SummaryBoilerplate /> first, or if the Summary should
   * handle that for you.
   */
  renderSummaryBoilerplate(): boolean {
    return true;
  }

  /**
   * When rendering a summary of a repeating group with `largeGroup: false`, every FormComponent inside each row is
   * rendered in a compact way. The default
   */
  public renderCompactSummary({ targetNode }: SummaryRendererProps<Type>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return (
      <SummaryItemCompact
        targetNode={targetNode}
        displayData={displayData}
      />
    );
  }
}

export abstract class ActionComponent<Type extends ComponentTypes> extends AnyComponent<Type> {
  readonly getComponentType = (): ComponentType => {
    return ComponentType.Action;
  };
}

export abstract class ContainerComponent<Type extends ComponentTypes> extends FormComponent<Type> {
  readonly getComponentType = (): ComponentType => {
    return ComponentType.Container;
  };
}

export type LayoutComponent<Type extends ComponentTypes = ComponentTypes> =
  | PresentationComponent<Type>
  | FormComponent<Type>
  | ActionComponent<Type>
  | ContainerComponent<Type>;
