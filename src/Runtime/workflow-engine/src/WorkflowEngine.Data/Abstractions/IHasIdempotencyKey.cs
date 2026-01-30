namespace WorkflowEngine.Data.Abstractions;

internal interface IHasIdempotencyKey
{
    string IdempotencyKey { get; set; }
}
