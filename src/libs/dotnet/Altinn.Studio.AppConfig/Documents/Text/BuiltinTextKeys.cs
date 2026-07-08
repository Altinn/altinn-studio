using System.Text.Json;

namespace Altinn.Studio.AppConfig.Documents.Text;

/// <summary>The app-frontend's built-in default text keys (<c>general.*</c>, <c>navigation.*</c>, …),
/// bundled as a version-coupled snapshot.</summary>
/// TODO: add values for different languages?
internal static class BuiltinTextKeys
{
    private const string ResourceName = "builtin-text-keys.json";

    private static readonly Lazy<IReadOnlySet<string>> _keys = new(Load);

    public static IReadOnlySet<string> Keys => _keys.Value;

    private static IReadOnlySet<string> Load()
    {
        var asm = typeof(BuiltinTextKeys).Assembly;
        var name = asm.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith(ResourceName, StringComparison.Ordinal));
        if (name is null)
            return new HashSet<string>(StringComparer.Ordinal);
        using var stream = asm.GetManifestResourceStream(name);
        if (stream is null)
            return new HashSet<string>(StringComparer.Ordinal);
        var keys = JsonSerializer.Deserialize<string[]>(stream) ?? Array.Empty<string>();
        return new HashSet<string>(keys, StringComparer.Ordinal);
    }
}
