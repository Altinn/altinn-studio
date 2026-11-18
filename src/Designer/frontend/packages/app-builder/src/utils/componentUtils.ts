import { ComponentType } from 'app-shared/types/ComponentType';
import type { LayoutComponent } from '../types';

/**
 * Returns the text resource key bound to the given property, such as `title`. A binding written as
 * an expression has no single key, so it returns undefined.
 */
export function getTextKey(component: LayoutComponent, property: string): string | undefined {
  const binding = component.textResourceBindings?.[property];
  return typeof binding === 'string' ? binding : undefined;
}

/**
 * Returns the value of a property that may be a boolean or an expression. The canvas does not
 * evaluate expressions, so an expression counts as false.
 */
export function getStaticBoolean(value: unknown): boolean {
  return value === true;
}

const typesWithRequired: string[] = [
  ComponentType.Input,
  ComponentType.TextArea,
  ComponentType.Checkboxes,
];

/**
 * Whether the canvas can switch the component between required and optional. It cannot when
 * `required` is an expression, since the canvas would overwrite logic it does not show.
 */
export function canToggleRequired(component: LayoutComponent): boolean {
  const { required } = component;
  return (
    typesWithRequired.includes(component.type) &&
    (required === undefined || typeof required === 'boolean')
  );
}
