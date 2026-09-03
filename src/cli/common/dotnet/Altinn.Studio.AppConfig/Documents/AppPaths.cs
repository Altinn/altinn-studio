namespace Altinn.Studio.AppConfig.Documents;

internal static class AppPaths
{
    public static string SetIdOf(string file)
    {
        const string prefix = "App/ui/";
        if (!file.StartsWith(prefix, StringComparison.Ordinal))
            return "";
        var rest = file[prefix.Length..];
        var slash = rest.IndexOf('/');
        return slash < 0 ? "" : rest[..slash];
    }

    public static string SchemaFile(string dataType) => $"App/models/{dataType}.schema.json";

    public static string ScopeOf(string? inTaskId, string file) => inTaskId ?? SetIdOf(file);
}
