namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Removes <c>GeneralSettings:HostName</c> from the app's appsettings files. The platform sets it in every Altinn
/// environment and studioctl for a local run, both overriding the file, and the default is <c>local.altinn.cloud</c>,
/// so a value in the file only goes stale, often as the old localtest host <c>altinn3local.no</c>. The exception is
/// <c>appsettings.Local.json</c>, which overrides both - a stale value there is the one that matters most, so it goes
/// too.
/// </summary>
internal static class GeneralSettingsHostNameMigration
{
    public static Task<MigrationResult> Migrate(string appFolder) =>
        AppSettingsKeyRemoval.Migrate(
            appFolder,
            "GeneralSettings",
            "HostName",
            removed: (messages, name, _) =>
                messages.Warn($"Removed GeneralSettings:HostName from {name}: the platform and studioctl set it."),
            notRemoved: (messages, name) =>
                messages.Todo(
                    $"Remove GeneralSettings:HostName from {name}: the platform and studioctl set it, but it could not "
                        + "be removed automatically."
                )
        );
}
