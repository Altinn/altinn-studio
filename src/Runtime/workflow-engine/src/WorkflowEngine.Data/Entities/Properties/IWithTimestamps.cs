namespace WorkflowEngine.Data.Entities;

internal interface IWithTimestamps
{
    DateTimeOffset CreatedAt { get; set; }
    DateTimeOffset? UpdatedAt { get; set; }
}
