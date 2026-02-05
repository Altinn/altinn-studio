namespace WorkflowEngine.Models;

public abstract record PersistentItem : IDisposable
{
    public long DatabaseId { get; internal set; }
    public required string IdempotencyKey { get; init; }
    public required string OperationId { get; set; }
    public PersistentItemStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; internal set; }
    public string? TraceContext { get; set; }

    public Task? DatabaseTask { get; set; }
    public int DatabaseTaskFails { get; set; }

    protected virtual void Dispose(bool disposing)
    {
        if (disposing)
        {
            DatabaseTask?.Dispose();
        }
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }
}
