using System.Diagnostics.CodeAnalysis;
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

    public static AppConfigEngine Open(IAppDirectory dir) => new(dir);

    public static AppConfigEngine Open(string root) => Open(ResolveDirectory(root));

    internal static FileSystemAppDirectory ResolveDirectory(string root)
    {
        var appDir = ResolveAppDir(root);
        var parent =
            Path.GetDirectoryName(appDir)
            ?? throw new InvalidOperationException($"not an altinn app directory: {root} (App/ has no parent)");
        return new FileSystemAppDirectory(parent);
    }

    private static string ResolveAppDir(string root)
    {
        var abs = Path.GetFullPath(root);
        foreach (var candidate in new[] { abs, Path.Combine(abs, "App") })
        {
            if (Directory.Exists(Path.Combine(candidate, "config")))
                return candidate;
        }
        throw new InvalidOperationException(
            $"not an altinn app directory: {root} (expected {abs}/config or {abs}/App/config to exist)"
        );
    }

    internal IReadOnlyList<string> LastReparsed { get; private set; } = Array.Empty<string>();

    public AppModel Current => Build();

    public AppModel Build()
    {
        var snapshot = _snapshots.Build(_dir);
        LastReparsed = snapshot.Reparsed;
        return snapshot.Model;
    }

    public ValidationReport Validate() => ValidationEngine.Run(Current);

    public ValidationReport ValidateSchemas(SchemaSet? schemas = null)
    {
        var model = Current;
        return model.UnsupportedAppVersion is not null
            ? new(model, Array.Empty<Finding>(), rulesRun: 0)
            : new(model, SchemaValidation.Collect(_dir, schemas ?? SchemaSet.Empty), rulesRun: 0);
    }

    public ValidationReport ValidateAll(SchemaSet? schemas = null)
    {
        var rules = Validate();
        var merged = ValidationEngine.Normalize(rules.Findings.Concat(ValidateSchemas(schemas).Findings).ToList());
        return new(Current, merged, rules.RulesRun);
    }

    public byte[]? ReadAllBytes(string relativePath) => _dir.ReadAllBytes(relativePath);

    public IEnumerable<string> EnumerateFiles(string relativeDir, string searchPattern, bool recursive) =>
        _dir.EnumerateFiles(relativeDir, searchPattern, recursive);

    public SourceSpan ResolvePosition(SourceSpan span) => _positionIndex.Resolve(_dir, span);

    public SourceSpan? ResolveNodeAt(string file, int line, int col) => _positionIndex.NodeAt(_dir, file, line, col);
}
