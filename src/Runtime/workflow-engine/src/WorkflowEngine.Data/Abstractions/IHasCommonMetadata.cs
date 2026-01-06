namespace WorkflowEngine.Data.Abstractions;

internal interface IHasCommonMetadata : IHasId, IHasKey, IHasStatus, IHasTimestamps;
