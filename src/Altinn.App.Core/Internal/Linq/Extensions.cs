using System.Diagnostics.CodeAnalysis;

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

    internal static bool IsNullOrEmpty<T>([NotNullWhen(false)] this IEnumerable<T>? enumerable)
    {
        return enumerable is null || !enumerable.Any();
    }
}
