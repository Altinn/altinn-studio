namespace WorkflowEngine.Api.Extensions;

internal static class HashSetExtensions
{
    public static void AddOrUpdate<T>(this HashSet<T> set, T item)
    {
        set.Remove(item);
        set.Add(item);
    }
}
