import type {
  ConditionalRenderingConnection,
  ConditionalRenderingConnections,
  RuleConfig,
  RuleConnection,
  RuleConnections,
} from 'app-shared/types/RuleConfig';

/**
 * Sets the rule connections for the rule config.
 * @param ruleConfig The old rule config.
 * @param ruleConnection The new rule connections.
 * @returns The new rule config.
 */
const setRuleConnections = (
  ruleConfig: RuleConfig,
  ruleConnection: RuleConnections,
): RuleConfig => ({ data: { ...ruleConfig.data, ruleConnection } });

/**
 * Adds a rule connection to the rule config.
 * @param ruleConfig The old rule config.
 * @param id The id of the new rule connection.
 * @param connection The new rule connection.
 * @returns The new rule config.
 */
export const addRuleConnection = (
  ruleConfig: RuleConfig,
  id: string,
  connection: RuleConnection,
) => {
  const newConnections = { ...ruleConfig.data.ruleConnection, [id]: connection };
  return setRuleConnections(ruleConfig, newConnections);
};

/**
 * Deletes a rule connection from the rule config.
 * @param ruleConfig The old rule config.
 * @param id The id of the rule connection to delete.
 * @returns The new rule config.
 */
export const deleteRuleConnection = (ruleConfig: RuleConfig, id: string) => {
  const newConnections = { ...ruleConfig.data.ruleConnection };
  delete newConnections[id];
  return setRuleConnections(ruleConfig, newConnections);
};

/**
 * Sets the conditional rendering connections for the rule config.
 * @param ruleConfig The old rule config.
 * @param conditionalRendering The new conditional rendering connections.
 * @returns The new rule config.
 */
const setConditionalRenderingConnections = (
  ruleConfig: RuleConfig,
  conditionalRendering: ConditionalRenderingConnections,
): RuleConfig => ({ data: { ...ruleConfig.data, conditionalRendering } });

/**
 * Adds a conditional rendering connection to the rule config.
 * @param ruleConfig The old rule config.
 * @param id The id of the new conditional rendering connection.
 * @param connection The new conditional rendering connection.
 * @returns The new rule config.
 */
export const addConditionalRenderingConnection = (
  ruleConfig: RuleConfig,
  id: string,
  connection: ConditionalRenderingConnection,
) => {
  const newConnections = { ...ruleConfig.data.conditionalRendering, [id]: connection };
  return setConditionalRenderingConnections(ruleConfig, newConnections);
};

/**
 * Deletes a conditional rendering connection from the rule config.
 * @param ruleConfig The old rule config.
 * @param id The id of the conditional rendering connection to delete.
 * @returns The new rule config.
 */
export const deleteConditionalRenderingConnection = (
  ruleConfig: RuleConfig,
  id: string,
): RuleConfig => {
  const newConnections = { ...ruleConfig.data.conditionalRendering };
  delete newConnections[id];
  return setConditionalRenderingConnections(ruleConfig, newConnections);
};

/**
 * Switches the selected field id in the conditional rendering connections and calls a given function if there are changes.
 * @param ruleConfig The old rule config.
 * @param currentId The id of the currently selected field.
 * @param newId The id of the new selected field.
 * @param callback The function to call if there are changes. It takes the updated rule config object as a parameter. Use this to save the rule config.
 * @returns void
 */
export const switchSelectedFieldId = async (
  ruleConfig: RuleConfig,
  currentId: string,
  newId: string,
  callback: (ruleConfig: RuleConfig) => Promise<RuleConfig>,
): Promise<void> => {
  let updated: boolean = false;
  const { conditionalRendering } = ruleConfig.data;
  Object.values(conditionalRendering).forEach(({ selectedFields }) => {
    Object.entries(selectedFields).forEach(([key, value]) => {
      if (value === currentId) {
        selectedFields[key] = newId;
        updated = true;
      }
    });
  });
  updated && (await callback(ruleConfig));
};
