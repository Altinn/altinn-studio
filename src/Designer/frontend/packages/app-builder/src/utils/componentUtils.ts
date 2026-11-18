import { ComponentType } from 'app-shared/types/ComponentType';
import type { LayoutComponent, TextsById } from '../types';
import { isQuestionType } from './newComponentUtils';
import { readHiddenProperty, readRequiredProperty, readRuleExpression } from './ruleUtils';
import type { RuleProperty } from './ruleUtils';
import { setProperty } from './layoutUtils';

/**
 * Returns the text resource key bound to the given property, such as `title`. A binding written as
 * an expression has no single key, so it returns undefined.
 */
export function getTextKey(component: LayoutComponent, property: string): string | undefined {
  const binding = component.textResourceBindings?.[property];
  return typeof binding === 'string' ? binding : undefined;
}

/** The text property that holds what the component says: its label, title or body. */
export function getMainTextProperty(component: LayoutComponent): string {
  return component.type === ComponentType.Alert ? 'body' : 'title';
}

/**
 * Returns the value of a property that may be a boolean or an expression. The canvas does not
 * evaluate expressions, so an expression counts as false.
 */
export function getStaticBoolean(value: unknown): boolean {
  return value === true;
}

/** The text that names the component for the user, such as its label. */
export function getComponentText(component: LayoutComponent, texts: TextsById): string | undefined {
  const textKey = getTextKey(component, getMainTextProperty(component));
  return textKey ? texts[textKey] || undefined : undefined;
}

/** Whether the user can choose if the component must be filled in. */
export function canBeRequired(component: LayoutComponent): boolean {
  return isQuestionType(component.type);
}

/** Whether the component saves an answer the user can see in a summary or use in a rule. */
export function hasAnswer(component: LayoutComponent): boolean {
  return isQuestionType(component.type) && component.type !== ComponentType.FileUpload;
}

/**
 * A file upload has no `required` property: it is required when it needs at least one attachment.
 * Required only when a rule is true is written as one attachment if the rule is true, else none.
 */
export function getRequiredProperty(component: LayoutComponent): RuleProperty {
  if (component.type === ComponentType.FileUpload) {
    return readMinNumberOfAttachments(component.minNumberOfAttachments);
  }
  return readRequiredProperty(component.required);
}

function readMinNumberOfAttachments(minimum: unknown): RuleProperty {
  if (minimum === undefined) return { kind: 'never' };
  if (typeof minimum === 'number') return { kind: minimum > 0 ? 'always' : 'never' };
  const isOneIfRule =
    Array.isArray(minimum) &&
    minimum.length === 5 &&
    minimum[0] === 'if' &&
    minimum[2] === 1 &&
    minimum[3] === 'else' &&
    minimum[4] === 0;
  const rule = isOneIfRule ? readRuleExpression(minimum[1]) : undefined;
  return rule ? { kind: 'rule', rule } : { kind: 'advanced' };
}

/** Sets `required` to true, false (left out) or an expression. */
export function setRequiredValue(component: LayoutComponent, value: unknown): LayoutComponent {
  if (component.type === ComponentType.FileUpload) {
    return { ...component, minNumberOfAttachments: toMinNumberOfAttachments(value) };
  }
  return setProperty(component, 'required', value === false ? undefined : value);
}

function toMinNumberOfAttachments(required: unknown): unknown {
  if (typeof required === 'boolean') return required ? 1 : 0;
  return ['if', required, 1, 'else', 0];
}

export function getHiddenProperty(component: LayoutComponent): RuleProperty {
  return readHiddenProperty(component.hidden);
}
