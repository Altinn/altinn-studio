namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Removes the <c>FeatureManagement:JsonObjectInDataResponse</c> flag from the app's appsettings files. v9 no longer
/// reads it and behaves as if it were on: the obsolete <c>POST .../data?dataType=</c> returns its validation issues
/// as JSON. An app that had the flag off gave clients a text instead, so that is pointed out.
/// </summary>
internal static class JsonObjectInDataResponseMigration
{
    private const string Flag = "FeatureManagement:JsonObjectInDataResponse";

    public static Task<MigrationResult> Migrate(string appFolder) =>
        AppSettingsKeyRemoval.Migrate(
            appFolder,
            "FeatureManagement",
            "JsonObjectInDataResponse",
            removed: (messages, name, value) =>
                messages.Warn(
                    bool.TryParse(value?.ToString(), out var enabled) && enabled
                        ? $"Removed {Flag} from {name}: v9 always returns validation issues from the data API as JSON."
                        : $"Removed {Flag} = {value?.ToJsonString() ?? "null"} from {name}: v9 always returns "
                            + "validation issues from the data API as JSON. A client of the obsolete POST "
                            + ".../data?dataType= now gets a list of validation issues instead of a text."
                ),
            notRemoved: (messages, name) =>
                messages.Todo(
                    $"Remove {Flag} from {name}: v9 no longer reads it and always returns validation issues from the "
                        + "data API as JSON, but it could not be removed automatically."
                )
        );
}
