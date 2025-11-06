#if !NET10_0_OR_GREATER
using System.Globalization;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Provides a custom string comparer that performs natural sorting, comparing numeric substrings as numbers rather than strings.
/// </summary>
/// <remarks>
/// This comparer is used to ensure that strings containing numeric values are ordered logically (e.g., "item2" &lt; "item10").
/// </remarks>
/// <example>
/// This class is marked as obsolete and is planned for removal when upgrading to .NET 10, as it will include built-in support for natural string comparison.
/// </example>
// [Obsolete("This utility can be removed in .NET 10")]
internal sealed class NaturalStringComparerPolyfill : IComparer<string>
{
    private static readonly CompareInfo _compareInfo = CultureInfo.InvariantCulture.CompareInfo;

    internal static readonly NaturalStringComparerPolyfill Instance = new();

    /// <inheritdoc />
    public int Compare(string? x, string? y)
    {
        if (ReferenceEquals(x, y))
            return 0;
        if (x is null)
            return -1;
        if (y is null)
            return 1;

        int i = 0,
            j = 0;
        while (i < x.Length && j < y.Length)
        {
            char cx = x[i];
            char cy = y[j];

            bool dx = IsAsciiDigit(cx);
            bool dy = IsAsciiDigit(cy);

            if (dx && dy)
            {
                // Read full digit runs
                int sx = i;
                while (i < x.Length && IsAsciiDigit(x[i]))
                    i++;
                int sy = j;
                while (j < y.Length && IsAsciiDigit(y[j]))
                    j++;

                // Skip leading zeros
                int zx = sx;
                while (zx < i && x[zx] == '0')
                    zx++;
                int zy = sy;
                while (zy < j && y[zy] == '0')
                    zy++;

                int lenX = i - zx;
                int lenY = j - zy;

                // Compare by numeric length (ignoring leading zeros)
                if (lenX != lenY)
                    return lenX.CompareTo(lenY);

                // Same length: compare digit-by-digit
                for (int k = 0; k < lenX; k++)
                {
                    int cmp = x[zx + k].CompareTo(y[zy + k]);
                    if (cmp != 0)
                        return cmp;
                }

                // Perfect numeric tie: shorter with more leading zeros comes first
                int leadingZerosCmp = (i - sx).CompareTo(j - sy);
                if (leadingZerosCmp != 0)
                    return leadingZerosCmp;

                // Otherwise continue
            }
            else
            {
                // ordnal for non digit chars
                int cmp = _compareInfo.Compare(x, i, 1, y, j, 1, CompareOptions.Ordinal);
                if (cmp != 0)
                    return cmp;
                i++;
                j++;
            }
        }

        // Shorter string first if all equal so far
        return (x.Length - i).CompareTo(y.Length - j);
    }

    private static bool IsAsciiDigit(char c) => c >= '0' && c <= '9';
}
#endif
