namespace Altinn.Studio.AppConfig.Documents;

/// <summary>Minimal file-name glob: a single <c>*</c> wildcard plus exact names.</summary>
internal static class GlobPattern
{
    public static bool Matches(string name, string pattern)
    {
        var star = pattern.IndexOf('*');
        if (star < 0)
            return string.Equals(name, pattern, StringComparison.Ordinal);
        var prefix = pattern[..star];
        var suffix = pattern[(star + 1)..];
        return name.Length >= prefix.Length + suffix.Length
            && name.StartsWith(prefix, StringComparison.Ordinal)
            && name.EndsWith(suffix, StringComparison.Ordinal);
    }

    public static string FileName(string path) => path[(path.LastIndexOf('/') + 1)..];

    public static string ParentDir(string path)
    {
        var slash = path.LastIndexOf('/');
        return slash >= 0 ? path[..slash] : "";
    }

    public static bool InDir(string path, string dir, bool recursive) =>
        recursive
            ? path.StartsWith(dir + "/", StringComparison.Ordinal)
            : string.Equals(ParentDir(path), dir, StringComparison.Ordinal);

    public static bool InBuildOutput(string path)
    {
        foreach (var segment in path.Split('/'))
        {
            if (segment is "bin" or "obj")
                return true;
        }
        return false;
    }
}
