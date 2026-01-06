namespace WorkflowEngine.Models;

public abstract record PersistentItem : IDisposable
{
    public long DatabaseId { get; set; }
    public required string Key { get; init; }
    public PersistentItemStatus Status { get; set; }

    public Step? DatabaseTask { get; set; }

    // TODO: Write a test for equality for inheritors. A bit suss on the persistence of these overrides during inheritance
    public virtual bool Equals(PersistentItem? other) =>
        other?.Key.Equals(Key, StringComparison.OrdinalIgnoreCase) is true;

    public override int GetHashCode() => Key.GetHashCode(StringComparison.InvariantCulture);

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
