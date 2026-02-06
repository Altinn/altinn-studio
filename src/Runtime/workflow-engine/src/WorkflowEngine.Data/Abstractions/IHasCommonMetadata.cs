namespace WorkflowEngine.Data.Abstractions;

internal interface IHasCommonMetadata : IHasId, IHasIdempotencyKey, IHasStatus, IHasTimestamps;
