namespace WorkflowEngine.Models;

public abstract record PersistentItem : IDisposable
{
    public long DatabaseId { get; set; }
    public required string IdempotencyKey { get; init; }
    public PersistentItemStatus Status { get; set; }
    public string? TraceContext { get; set; }

    public Task? DatabaseTask { get; set; }

    // TODO: Write a test for equality for inheritors. A bit suss on the persistence of these overrides during inheritance
    public virtual bool Equals(PersistentItem? other) =>
        other?.IdempotencyKey.Equals(IdempotencyKey, StringComparison.OrdinalIgnoreCase) is true;

    public override int GetHashCode() => IdempotencyKey.GetHashCode(StringComparison.InvariantCulture);

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
