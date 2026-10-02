using System.Globalization;
using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Models;

internal sealed class FrontendPageOrder : IComparer<string>
{
    public static readonly FrontendPageOrder Instance = new();

    public static IEnumerable<string> OfLayoutFiles(IEnumerable<string> layoutFiles) =>
        layoutFiles
            .OrderBy(AppPaths.SetIdOf, StringComparer.Ordinal)
            .ThenBy(file => Path.GetFileNameWithoutExtension(file), Instance);

    public int Compare(string? x, string? y)
    {
        var xIsIndex = TryArrayIndex(x, out var xIndex);
        var yIsIndex = TryArrayIndex(y, out var yIndex);
        if (xIsIndex && yIsIndex)
            return xIndex.CompareTo(yIndex);
        if (xIsIndex != yIsIndex)
            return xIsIndex ? -1 : 1;
        return string.CompareOrdinal(x, y);
    }

    private static bool TryArrayIndex(string? page, out uint index)
    {
        index = 0;
        if (string.IsNullOrEmpty(page) || (page.Length > 1 && page[0] == '0'))
            return false;
        foreach (var c in page)
            if (c is < '0' or > '9')
                return false;
        return uint.TryParse(page, NumberStyles.None, CultureInfo.InvariantCulture, out index)
            && index != uint.MaxValue;
    }
}
