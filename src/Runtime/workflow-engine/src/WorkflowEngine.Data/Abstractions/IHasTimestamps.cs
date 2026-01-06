namespace WorkflowEngine.Data.Abstractions;

internal interface IHasTimestamps
{
    DateTimeOffset CreatedAt { get; set; }
    DateTimeOffset? UpdatedAt { get; set; }
}
