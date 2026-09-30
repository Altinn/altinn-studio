using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Unique;

internal sealed class UniqueJsonKeyRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "UNIQUE-JSON-KEY",
            "A key must appear at most once in a JSON object",
            "A key repeated within one object of a JSON config file, usually a copy-paste slip or a "
                + "merge leftover, does not stop the app: it reads only the last occurrence and ignores "
                + "the earlier ones. Each ignored occurrence is reported, so you can remove it or move "
                + "the value you meant to the last one. The other checks, including the schema check, "
                + "read the file the same way as the app.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var duplicate in app.DuplicateKeys)
            yield return Metadata.Report(
                $"key \"{duplicate.Name}\" is repeated in the same object; the app reads only the last "
                    + $"occurrence (line {duplicate.LastPosition.Line}), so this value is ignored",
                duplicate.Position
            );
    }
}
