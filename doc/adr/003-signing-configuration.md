# Configuration of a signing task - Task and interface coupling

-   Status: Accepted
-   Deciders: Team Apps
-   Date: 2024-09-25

## Result

-   A1: An `altinn:signatureConfig` section on the task extension in the BPMN definition where all signature configuration is consolidated.

## Problem context

There are several configurations needed for a signing task. This includes which datatypes are a part of the signing package, the datatype for the signature itself,
the datatype id for the app internal state object, the implementation of the ISigneeProvider interface, the signing pdf data type, the correspondence resource
and whether to use the default signing task validator or not.

This ADR is written post-implementation, and aims to explain the different approaches that were considered and why the chosen alternative was preffered.

## Decision drivers

-   B1: Logical implementation for app developers
-   B2: Logical implementation in Altinn Studio Designer
-   B3: Avoid configuration spread for related properties
-   B4: Consistency with existing configuration pattern(s)
-   B5: Constrict a task *-0..1 provider

## Alternatives considered

-   A1: An `altinn:signatureConfig` section on the task extension in the BPMN definition where all signature configuration is consolidated.
-   A2: Keep most the configuration in `altinn:signatureConfig`, but handle the coupling between signing task and ISigneeProvider in the implementation of the interface

As the alternatives only differ in the approach to the ISigneeProvider coupling, we delve more into that here

### A1 - ISigneeProvider configuration suggestion

BPMN:
```xml
<bpmn:task id="SigningTask_1" name="My signing task">
    <bpmn:extensionElements>
        <altinn:taskExtension>
            <altinn:taskType>signing</altinn:taskType>
            ...
            <altinn:signatureConfig>
                ...
                <altinn:signeeProviderId>my-provider-id</altinn:signeeProviderId>
                ...
            </altinn:signatureConfig>
        </altinn:taskExtension>
    </bpmn:extensionElements>
</bpmn:task>
```
C#:
```csharp
public class MySigneesProvider(...) : ISigneeProvider
{
    public string Id { get; init; } = "my-provider-id";

    public async Task<SigneeProviderResult> GetSigneesAsync(...)
    {
        ...
    }
}
```

### A2 - ISigneeProvider configuration suggestion

Here we display the diff compared to A1, use a markdown renderer to view.

BPMN:
```diff
<bpmn:task id="SigningTask_1" name="My signing task">
    <bpmn:extensionElements>
        <altinn:taskExtension>
            <altinn:taskType>signing</altinn:taskType>
            ...
            <altinn:signatureConfig>
                ...
-               <altinn:signeeProviderId>my-provider-id</altinn:signeeProviderId>
                ...
            </altinn:signatureConfig>
        </altinn:taskExtension>
    </bpmn:extensionElements>
</bpmn:task>
```
C#:
```diff
public class MySigneesProvider(...) : ISigneeProvider
{
-   public string Id { get; init; } = "my-provider-id";
+   public string TaskId { get; init; } = "SigningTask_1";

    public async Task<SigneeProviderResult> GetSigneesAsync(...)
    {
        ...
    }
}
```

## Pros and cons

### A1

-   Good, supports B1 (Logical of implementation for app developers) as all config is in on the task definition.
-   Good, supports B2 (Logical implementation in Altinn Studio Designer) as the BPMN file would be updates as a user add configuration to the task. The implementation of ISigneeProvider is custom code and not expected to have designer support. A standard implementation of the interface has to be considered in another ADR.
-   Good, supports B3 - avoids spreading the related configuration to multiple files, can see all signature related config on the task definition
-   Bad, B4 - does not use an existing pattern. However, the use case is different as the relationship between task and provider is task has 0..1 provider. The pattern of using the Id of an implementation in a task definition is to be used for servicetasks.
-   Good, B5 - Forces a 0..1 relationship between task and provider

### A2

-   Good, supports B1 (Logical of implementation for app developers) as most config is on the task definition, and the pattern for coupling ISigneeProvider to the Task is known from validation.
-   Good, supports B2 (Logical implementation in Altinn Studio Designer) as the BPMN file would be updates as a user add configuration to the task. The implementation of ISigneeProvider is custom code and not expected to have designer support. A standard implementation of the interface has to be considered in another ADR.
-   Bad, does not support B3 (Avoid configuration spread for related properties) - does not allow an app developer to see the entire signature configuration of the task in the signature task definition.
-   Good, uses an established pattern (B4). With a different use case, a different pattern might be considered, though.
-   Bad, B5 - does not force a 0..1 relationship between task and provider
