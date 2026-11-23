import { useAppBuilder } from '../contexts/AppBuilderContext';
import { hasAnswer } from '../utils/componentUtils';
import { getAllComponents } from '../utils/layoutUtils';
import { resolveOptions } from '../utils/optionUtils';
import type { RuleField } from '../utils/ruleUtils';

/** The fields in the layout set that a rule on the given component or page can check. */
export const useRuleFields = (ownerId?: string): RuleField[] => {
  const { layouts, texts, codeLists } = useAppBuilder();
  return getAllComponents(layouts)
    .filter((component) => hasAnswer(component) && component.id !== ownerId)
    .map((component) => ({
      componentId: component.id,
      values: resolveOptions(component, texts, codeLists).map(({ value }) => value),
    }));
};
