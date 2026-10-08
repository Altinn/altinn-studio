namespace Altinn.Studio.AppConfig.Models;

internal static class NameDistance
{
    public static string? Closest(string value, IEnumerable<string> candidates)
    {
        var limit = Math.Max(2, value.Length / 4);
        string? best = null;
        var bestDistance = int.MaxValue;
        foreach (var candidate in candidates)
        {
            if (string.Equals(candidate, value, StringComparison.Ordinal))
                return null;
            if (string.Equals(candidate, value, StringComparison.OrdinalIgnoreCase))
                return candidate;
            if (Math.Abs(candidate.Length - value.Length) > limit)
                continue;
            var d = Levenshtein(value, candidate);
            if (d < bestDistance)
            {
                bestDistance = d;
                best = candidate;
            }
        }
        return bestDistance <= limit ? best : null;
    }

    private static int Levenshtein(string a, string b)
    {
        var prev = new int[b.Length + 1];
        var cur = new int[b.Length + 1];
        for (var j = 0; j <= b.Length; j++)
            prev[j] = j;
        for (var i = 1; i <= a.Length; i++)
        {
            cur[0] = i;
            for (var j = 1; j <= b.Length; j++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                cur[j] = Math.Min(Math.Min(prev[j] + 1, cur[j - 1] + 1), prev[j - 1] + cost);
            }
            (prev, cur) = (cur, prev);
        }
        return prev[b.Length];
    }
}
