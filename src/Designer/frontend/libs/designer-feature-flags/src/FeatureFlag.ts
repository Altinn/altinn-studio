export enum FeatureFlag {
  AddComponentModal = 'addComponentModal',
  AiAssistant = 'aiAssistant',
  AppTemplateV9 = 'appTemplateV9',
  BrokerFileTransfer = 'brokerFileTransfer',
  ComponentConfigBeta = 'componentConfigBeta',
  CustomTemplates = 'customTemplates',
  NewCodeLists = 'newCodeLists',
  NextV9 = 'nextV9',
  EnableAltinn2RolesPolicyEditor = 'enableAltinn2RolesPolicyEditor',
  ShouldOverrideAppLibCheck = 'shouldOverrideAppLibCheck',
}

export const experimentalFeatureFlags: readonly FeatureFlag[] = [
  FeatureFlag.AddComponentModal,
  FeatureFlag.NewCodeLists,
  FeatureFlag.AppTemplateV9,
];
