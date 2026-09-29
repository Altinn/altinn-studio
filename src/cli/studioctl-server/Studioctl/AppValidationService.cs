using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.StudioctlServer.Studioctl;

internal enum AppValidationResultKind
{
    Invalid,
    LoadFailed,
    Completed,
}

internal sealed record AppValidationFinding(
    string RuleId,
    Severity Severity,
    string Message,
    string File,
    string? Pointer,
    int Line,
    int Column
);

internal sealed record AppValidationResult(
    AppValidationResultKind Kind,
    string Message,
    IReadOnlyList<AppValidationFinding> Findings,
    ValidationSummary Summary,
    SchemaValidationStatus SchemaValidation
)
{
    private static readonly ValidationSummary _emptySummary = new(0, 0, 0, 0);
    private static readonly SchemaValidationStatus _noSchemaValidation = new(false, null, null, []);

    public static AppValidationResult Invalid(string message) =>
        new(AppValidationResultKind.Invalid, message, [], _emptySummary, _noSchemaValidation);

    public static AppValidationResult LoadFailed(string message) =>
        new(AppValidationResultKind.LoadFailed, message, [], _emptySummary, _noSchemaValidation);

    public static AppValidationResult Completed(
        IReadOnlyList<AppValidationFinding> findings,
        ValidationSummary summary,
        SchemaValidationStatus schemaValidation
    ) => new(AppValidationResultKind.Completed, "", findings, summary, schemaValidation);
}

internal sealed class AppValidationService(AppDistSchemasService schemas) : IDisposable
{
    private readonly SemaphoreSlim _validationLock = new(1, 1);

    public async Task<AppValidationResult> RunAsync(string? path, string? severity, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(path))
            return AppValidationResult.Invalid("path is required");

        var minSeverity = Severity.Warning;
        if (!string.IsNullOrEmpty(severity) && !SeverityExtensions.TryParse(severity, out minSeverity))
            return AppValidationResult.Invalid($"invalid severity: {severity}");

        var root = Path.GetFullPath(path);
        if (!Directory.Exists(root))
            return AppValidationResult.Invalid($"directory does not exist: {root}");

        await _validationLock.WaitAsync(cancellationToken);
        try
        {
            AppConfigEngine engine;
            AppModel model;
            try
            {
                engine = AppConfigEngine.Open(root);
                model = engine.Build();
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                return AppValidationResult.LoadFailed($"load app: {ex.Message}");
            }

            var schemaSet = model.UnsupportedAppVersion is not null
                ? SchemaSetResult.Skipped("the app's Altinn.App version is unsupported")
                : await schemas.GetAsync(model.AltinnAppVersion, cancellationToken);
            var report = engine.ValidateAll(schemaSet.Schemas).Filter(minSeverity);

            var findings = report
                .Findings.Select(f =>
                {
                    var pos = engine.ResolvePosition(f.Position);
                    return new AppValidationFinding(
                        f.RuleId,
                        f.Severity,
                        f.Message,
                        pos.File,
                        pos.Pointer,
                        pos.Line,
                        pos.Column
                    );
                })
                .ToArray();
            return AppValidationResult.Completed(findings, report.Summary(), schemaSet.Status);
        }
        finally
        {
            _validationLock.Release();
        }
    }

    public void Dispose() => _validationLock.Dispose();
}
