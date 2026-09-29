using System.Diagnostics.CodeAnalysis;
using System.Text;

namespace Altinn.Studio.AppConfig.Models;

internal static class ModelPath
{
    public static string StripArrayIndices(string path)
    {
        if (path.IndexOf('[') < 0)
            return path;
        var sb = new StringBuilder(path.Length);
        var depth = 0;
        foreach (var ch in path)
        {
            if (ch == '[')
                depth++;
            else if (ch == ']')
            {
                if (depth > 0)
                    depth--;
            }
            else if (depth == 0)
                sb.Append(ch);
        }
        return sb.ToString();
    }

    public static bool TryResolveType(
        IReadOnlyDictionary<string, string> props,
        string path,
        [NotNullWhen(true)] out string? type
    )
    {
        if (props.TryGetValue(path, out type))
            return true;
        return props.TryGetValue(StripArrayIndices(path), out type);
    }

    public static bool Exists(IReadOnlyDictionary<string, string> props, string path) =>
        props.ContainsKey(path) || props.ContainsKey(StripArrayIndices(path));
}
