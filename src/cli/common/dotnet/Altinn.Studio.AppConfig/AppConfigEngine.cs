using Altinn.Studio.AppConfig.Building;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Validation;
using Altinn.Studio.AppConfig.Validation.Schemas;

namespace Altinn.Studio.AppConfig;

public sealed class AppConfigEngine
{
    private readonly IAppDirectory _dir;
    private readonly SnapshotBuilder _snapshots;
    private readonly PositionIndex _positionIndex = new();

    private AppConfigEngine(IAppDirectory dir)
    {
        if (!dir.DirectoryExists("App/config"))
        {
            throw new InvalidOperationException(
                $"not an altinn app directory: {dir.Root} (expected App/config to exist)"
            );
        }
        _dir = dir;
        _snapshots = new SnapshotBuilder();
    }

    public static AppConfigEngine Open(IAppDirectory dir)
    {
        ArgumentNullException.ThrowIfNull(dir);
        return new(dir);
    }

    public static AppConfigEngine Open(string root) => Open(ResolveDirectory(root));

    public static FileSystemAppDirectory? TryResolveDirectory(string root)
    {
        ArgumentNullException.ThrowIfNull(root);
        var abs = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root));
        if (ContainsAppConfig(abs))
            return new FileSystemAppDirectory(abs);
        if (
            string.Equals(Path.GetFileName(abs), "App", StringComparison.Ordinal)
            && Path.GetDirectoryName(abs) is { } parent
            && ContainsAppConfig(parent)
        )
            return new FileSystemAppDirectory(parent);
        return null;
    }

    private static bool ContainsAppConfig(string repositoryRoot) =>
        Directory.Exists(Path.Combine(repositoryRoot, "App", "config"));

    internal static FileSystemAppDirectory ResolveDirectory(string root) =>
        TryResolveDirectory(root)
        ?? throw new InvalidOperationException(
            $"not an altinn app directory: {root} (expected App/config beneath it, or config/ in it as the App directory)"
        );

    internal IReadOnlyList<string> LastReparsed { get; private set; } = Array.Empty<string>();

    public AppModel Current => Build();

    public AppModel Build()
    {
        var snapshot = _snapshots.Build(_dir);
        LastReparsed = snapshot.Reparsed;
        return snapshot.Model;
    }

    public ValidationReport Validate() => ValidationEngine.Run(Current);

    public ValidationReport ValidateSchemas(SchemaSet? schemas = null) => ValidateSchemas(Current, schemas);

    public ValidationReport ValidateAll(SchemaSet? schemas = null)
    {
        var model = Current;
        var rules = ValidationEngine.Run(model);
        var merged = ValidationEngine.Normalize(
            rules.Findings.Concat(ValidateSchemas(model, schemas).Findings).ToList()
        );
        return new(model, merged, rules.RulesRun);
    }

    private ValidationReport ValidateSchemas(AppModel model, SchemaSet? schemas) =>
        model.UnsupportedAppVersion is not null
            ? new(model, Array.Empty<Finding>(), rulesRun: 0)
            : new(model, SchemaValidation.Collect(_dir, schemas ?? SchemaSet.Empty), rulesRun: 0);

    public byte[]? ReadAllBytes(string relativePath) => _dir.ReadAllBytes(relativePath);

    public IEnumerable<string> EnumerateFiles(string relativeDir, string searchPattern, bool recursive) =>
        _dir.EnumerateFiles(relativeDir, searchPattern, recursive);

    public SourceSpan ResolvePosition(SourceSpan span) => _positionIndex.Resolve(_dir, span);

    public SourceSpan? ResolveNodeAt(string file, int line, int col)
    {
        ArgumentNullException.ThrowIfNull(file);
        return _positionIndex.NodeAt(_dir, file, line, col);
    }
}
