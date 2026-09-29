namespace Altinn.Studio.AppConfig.Validation.Schemas;

public sealed record SchemaValidationStatus(bool Ran, string? Version, string? Reason, IReadOnlyList<string> Warnings);

public sealed record SchemaSetResult(SchemaSet Schemas, SchemaValidationStatus Status)
{
    public static SchemaSetResult Skipped(string reason, string? version = null) =>
        new(SchemaSet.Empty, new SchemaValidationStatus(false, version, reason, []));

    public static SchemaSetResult Loaded(string version, SchemaSet schemas)
    {
        ArgumentNullException.ThrowIfNull(schemas);
        return new(schemas, new SchemaValidationStatus(true, version, null, schemas.LoadWarnings));
    }
}
