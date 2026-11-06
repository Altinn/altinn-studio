export enum FeatureFlag {
  AddComponentModal = 'addComponentModal',
  AiAssistant = 'aiAssistant',
  ComponentConfigBeta = 'componentConfigBeta',
  CustomTemplates = 'customTemplates',
  NewCodeLists = 'newCodeLists',
  NextV9 = 'nextV9',
  EnableAltinn2RolesPolicyEditor = 'enableAltinn2RolesPolicyEditor',
  ShouldOverrideAppLibCheck = 'shouldOverrideAppLibCheck',
}

export type FeatureFlagConfig = {
  experimental: boolean;
  /**
   * Whether the experimental features page marks the flag as new.
   */
  isNew?: boolean;
};

export const featureFlagConfig: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.AddComponentModal]: { experimental: true },
  [FeatureFlag.AiAssistant]: { experimental: false },
  [FeatureFlag.ComponentConfigBeta]: { experimental: false },
  [FeatureFlag.CustomTemplates]: { experimental: true },
  [FeatureFlag.NewCodeLists]: { experimental: true },
  [FeatureFlag.NextV9]: { experimental: false },
  [FeatureFlag.EnableAltinn2RolesPolicyEditor]: { experimental: false },
  [FeatureFlag.ShouldOverrideAppLibCheck]: { experimental: false },
};

export const experimentalFeatureFlags: readonly FeatureFlag[] = Object.values(FeatureFlag).filter(
  (flag) => featureFlagConfig[flag].experimental,
);
