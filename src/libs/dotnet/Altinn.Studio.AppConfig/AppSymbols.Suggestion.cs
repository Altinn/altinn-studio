using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig;

public sealed partial class AppSymbols
{
    public string? SuggestCorrection(string file, int line, int col)
    {
        if (_config.ResolveNodeAt(file, line, col) is not { } node)
            return null;
        var ptr = node.Pointer;
        var model = _config.Current;

        foreach (var r in model.Refs.DataModel)
            if (Same(r.Position, file, ptr))
                return Closest(r.Value, EffectiveSchema(model, r).Keys);
        foreach (var r in model.Refs.TextResources)
            if (Same(r.Position, file, ptr))
                return Closest(r.Value, model.TextResources.SelectMany(t => t.Ids.Keys));
        foreach (var r in model.Refs.DataTypes)
            if (Same(r.Position, file, ptr))
                return Closest(r.Value, model.DataTypes.Select(d => d.Id));
        foreach (var r in model.Refs.ComponentIds)
            if (Same(r.Position, file, ptr))
                return Closest(r.Value, model.LayoutSets.SelectMany(s => s.AllComponents).Select(c => c.Id));
        foreach (var r in model.Refs.OptionsIds)
            if (Same(r.Position, file, ptr))
                return Closest(r.Value, model.OptionsFiles.Keys.Concat(model.OptionsProviders));
        foreach (var r in model.Refs.PageFiles)
            if (Same(r.Position, file, ptr))
                return Closest(r.Value, model.LayoutFiles.Select(f => Path.GetFileNameWithoutExtension(f) ?? ""));
        foreach (var r in model.Refs.TaskIds)
            if (Same(r.Position, file, ptr))
                return Closest(r.Value, model.Tasks.Select(t => t.Id));
        return null;
    }

    private static string? Closest(string value, IEnumerable<string> candidates)
    {
        string? best = null;
        var bestDistance = int.MaxValue;
        foreach (var candidate in candidates)
        {
            if (string.Equals(candidate, value, StringComparison.Ordinal))
                return null;
            if (string.Equals(candidate, value, StringComparison.OrdinalIgnoreCase))
                return candidate;
            var d = Levenshtein(value, candidate);
            if (d < bestDistance)
            {
                bestDistance = d;
                best = candidate;
            }
        }
        return bestDistance <= Math.Max(2, value.Length / 4) ? best : null;
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
