# Configuration of correspondence resource for signing tasks - Environment-specific configuration

- Status: Accepted
- Deciders: Team Apps, Johannes Haukland
- Date: 2025-06-12

## Result

- A2: Environment-specific correspondence resource configuration within `altinn:signatureConfig` using direct `altinn:correspondenceResource` elements with `env` attributes in BPMN definition.

## Problem context

A correspondence resource is a resource configured specifically for use with the correspondence service. This includes sending messages to the Altinn Inbox and sending notifications via email and sms using the notification service. A correspondence resource is required for user delegated signing, as concluded by ADR-004. Without such a resource, the signees would not be able to navigate to the form which they are to sign. If users are to receive receipts, a correspondence resource is also needed.

The service owner might want to use different resources for each environment, in order to make it easier to track costs or set different access rules depending on the environment.

This ADR is written post-implementation, and aims to explain the different approaches that were considered and why the chosen alternative was preffered.

## Decision drivers

- B1: Consolidate signing-related configuration in one location
- B2: Support environment-specific configuration where needed
- B3: Maintain consistency with existing configuration patterns
- B4: Optimize for developer experience
- B5: Prepare for future where default resources may be automatically created

## Alternatives considered

- A1: Environment-specific correspondence resource configuration using `altinn:environmentConfigs` wrapper structure
- A2: Environment-specific correspondence resource configuration using direct `altinn:correspondenceResource` elements with `env` attributes
- A3: Correspondence resource configuration in `appsettings.json` with built-in environment support
- A4: Single global correspondence resource configuration (no environment-specific support)

### A1 - BPMN with environmentConfigs wrapper structure

```xml
<altinn:signatureConfig>
  <altinn:dataTypesToSign>
    <altinn:dataType>signatureDataType</altinn:dataType>
  </altinn:dataTypesToSign>
  <altinn:signatureDataType>signature</altinn:signatureDataType>
  <altinn:environmentConfigs>
    <altinn:environmentConfig env="staging">
      <altinn:correspondenceResource>correspondenceResourceStaging</altinn:correspondenceResource>
    </altinn:environmentConfig>
    <altinn:environmentConfig env="prod">
      <altinn:correspondenceResource>correspondenceResourceProd</altinn:correspondenceResource>
    </altinn:environmentConfig>
  </altinn:environmentConfigs>
</altinn:signatureConfig>
```

### A2 - BPMN with direct correspondenceResource elements (CHOSEN)

```xml
<altinn:signatureConfig>
  <altinn:dataTypesToSign>
    <altinn:dataType>signatureDataType</altinn:dataType>
  </altinn:dataTypesToSign>
  <altinn:signatureDataType>signature</altinn:signatureDataType>
  <altinn:correspondenceResource env="staging">correspondenceResourceStaging</altinn:correspondenceResource>
  <altinn:correspondenceResource env="prod">correspondenceResourceProd</altinn:correspondenceResource>
</altinn:signatureConfig>
```

### A3 - appsettings.json configuration

```json
{
  "AppSettings": {
    "SigningCorrespondenceResource": "ressurs-id"
  }
}
```

With environment-specific files (`appsettings.Production.json`, etc.) providing overrides.

### A4 - Single global configuration

No environment-specific support, requiring same resource ID across all environments.

## Pros and cons

### A1 - BPMN with environmentConfigs wrapper structure

- **Good**: Supports B1 - consolidates all signing configuration in one location (BPMN file)
- **Good**: Supports B2 - provides environment-specific configuration capability
- **Good**: Supports B3 - follows established pattern of wrapper structures like `dataTypesToSign`
- **Good**: Easily extensible for multiple environment-specific properties in the future
- **Bad**: More verbose XML structure
- **Bad**: Developer must explicitly specify environments, risk of forgetting production configuration

### A2 - BPMN with direct correspondenceResource elements (CHOSEN)

- **Good**: Supports B1 - consolidates all signing configuration in one location (BPMN file)
- **Good**: Supports B2 - provides environment-specific configuration capability
- **Good**: Supports B4 - more compact and readable XML structure
- **Good**: Allows optional `env` attribute - if omitted, value applies to all environments
- **Neutral**: Less consistent with wrapper patterns but more intuitive for single properties
- **Bad**: May become less organized if many properties need environment-specific configuration
- **Bad**: Developer must explicitly specify environments, risk of forgetting production configuration

### A3 - appsettings.json configuration

- **Good**: Supports B2 - built-in environment support through .NET configuration system
- **Good**: Follows established .NET patterns
- **Bad**: Does not support B1 - separates signing configuration across multiple files
- **Bad**: Does not support B4 - developer must look in multiple places for complete signing setup
- **Neutral**: Supports B3 - consistent with other integration configurations (Maskinporten, etc.)

### A4 - Single global configuration

- **Good**: Supports B1 - simple, consolidated configuration
- **Good**: Supports B4 - easy for developers to understand and configure
- **Bad**: Does not support B2 - no environment-specific configuration
- **Bad**: May not support B5 - could create complications when different environments need different resources

## Decision rationale

The decision favors A2 (BPMN with direct correspondenceResource elements) based on the principle of consolidating related configuration while maintaining a clean, readable structure.

Key factors in the decision:
1. **Configuration consolidation**: Developers can see all signing configuration in one location
2. **Compact structure**: More streamlined than wrapper-based approaches while still supporting environment-specific configuration
3. **Flexibility**: Optional `env` attribute allows global defaults when environment-specific configuration isn't needed
4. **Future considerations**: While less structured than wrapper approaches, it's simpler for the current single-property use case

The team chose this approach after a poll comparing the wrapper structure (A1) with the direct element approach (A2), with the latter being selected for its balance of functionality and simplicity.
