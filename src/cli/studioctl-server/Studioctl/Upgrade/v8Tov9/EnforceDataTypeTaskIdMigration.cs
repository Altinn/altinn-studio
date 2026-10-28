using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Removes <c>AppSettings:EnforceDataTypeTaskId</c> from the app's appsettings files, since v9 always enforces it. A
/// false value is a warning, not a to-do: v8 defaults the setting to false, so an app without it behaved the same.
/// </summary>
internal static class EnforceDataTypeTaskIdMigration
{
    private const string Setting = "AppSettings:EnforceDataTypeTaskId";

    private const string Check =
        "always refuses changes through the app APIs to a data type's data outside the tasks it is bound to";

    public static Task<MigrationResult> Migrate(string appFolder) =>
        AppSettingsKeyRemoval.Migrate(
            appFolder,
            "AppSettings",
            "EnforceDataTypeTaskId",
            removed: (messages, name, value) =>
                messages.Warn(
                    $"Removed {Setting} = {value?.ToJsonString() ?? "null"} from {name}: v9 {Check}.{AdviceWhenOff(value)}"
                ),
            notRemoved: (messages, name) =>
                messages.Todo(
                    $"Remove {Setting} from {name}: v9 no longer reads it and {Check}, but it could not be removed "
                        + "automatically."
                )
        );

    private static string AdviceWhenOff(JsonNode? value) =>
        bool.TryParse(value?.ToString(), out var enabled) && !enabled
            ? " If the app writes such data in another task, fix a data binding that points at another task's data "
                + "model, or, if that task writes it on purpose, add the task to the data type's taskIds in "
                + "applicationmetadata.json."
            : "";
}
