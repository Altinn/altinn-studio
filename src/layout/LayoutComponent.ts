import { components, ComponentType } from 'src/layout/index';
import type { PropsFromGenericComponent } from 'src/layout/index';
import type { ComponentExceptGroupAndSummary } from 'src/layout/layout';

export abstract class LayoutComponent<Type extends ComponentExceptGroupAndSummary> {
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
   * Purly presentational components with no interaction should override and return ComponentType.Presentation.
   */
  getComponentType(): ComponentType {
    return ComponentType.Form;
  }
}

export function getLayoutComponentObject<T extends string | undefined | ComponentExceptGroupAndSummary>(
  type: T,
): T extends ComponentExceptGroupAndSummary ? LayoutComponent<T> : undefined {
  if (type && type in components) {
    return components[type as keyof typeof components] as any;
  }
  return undefined as any;
}
