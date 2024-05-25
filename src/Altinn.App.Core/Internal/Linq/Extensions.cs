namespace System.Linq;

internal static class Extensions
{
    internal static IEnumerable<T> WhereNotNull<T>(this IEnumerable<T?> source)
        where T : class
    {
        ArgumentNullException.ThrowIfNull(source);

        foreach (var item in source)
        {
            if (item is not null)
            {
                yield return item;
            }
        }
    }
}
