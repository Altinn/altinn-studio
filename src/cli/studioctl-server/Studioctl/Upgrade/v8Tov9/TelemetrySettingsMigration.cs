using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Removes the telemetry settings v9 no longer reads from the app's appsettings files: <c>AppSettings:UseOpenTelemetry</c>,
/// <c>AppSettings:UseOpenTelemetryCollector</c>, the <c>ApplicationInsights</c> section, <c>Logging:ApplicationInsights</c>
/// and top-level <c>OTEL_*</c> keys.
/// A v9 app exports telemetry only over OpenTelemetry (OTLP), to the collectors in the runtime cluster, which forward it
/// to the service owner's Application Insights. The runtime, and studioctl for a local run, configure the exporter with
/// the standard <c>OTEL_*</c> environment variables.
/// </summary>
internal static class TelemetrySettingsMigration
{
    private const string Why =
        "v9 apps export telemetry only over OpenTelemetry, to the runtime's collectors, which forward it to the service "
        + "owner's Application Insights";

    /// <summary>The value the app template has always had in the <c>ApplicationInsights</c> section.</summary>
    private const string TemplatePlaceholder = "retrieved from environment at runtime";

    public static async Task<MigrationResult> Migrate(string appFolder)
    {
        var useOpenTelemetry = await AppSettingsKeyRemoval.Migrate(
            appFolder,
            "AppSettings",
            "UseOpenTelemetry",
            removed: (messages, name, value) =>
            {
                if (value?.GetValueKind() == System.Text.Json.JsonValueKind.True)
                    messages.Ok($"Removed AppSettings:UseOpenTelemetry from {name}: every v9 app uses OpenTelemetry.");
                else
                    messages.Warn(
                        $"Removed AppSettings:UseOpenTelemetry = {Describe(value)} from {name}: {Why}, so the app now "
                            + "exports OpenTelemetry like every v9 app."
                    );
            },
            notRemoved: (messages, name) => NotRemoved(messages, name, "AppSettings:UseOpenTelemetry")
        );

        var useCollector = await AppSettingsKeyRemoval.Migrate(
            appFolder,
            "AppSettings",
            "UseOpenTelemetryCollector",
            removed: (messages, name, _) =>
                messages.Ok(
                    $"Removed AppSettings:UseOpenTelemetryCollector from {name}: {Why}. The runtime and studioctl "
                        + "set where it goes."
                ),
            notRemoved: (messages, name) => NotRemoved(messages, name, "AppSettings:UseOpenTelemetryCollector")
        );

        var applicationInsights = await AppSettingsPropertyRemoval.Migrate(
            appFolder,
            ["ApplicationInsights"],
            removed: (messages, name, value) =>
            {
                if (IsTemplatePlaceholder(value))
                {
                    messages.Ok($"Removed the ApplicationInsights section from {name}: {Why}.");
                }
                else
                {
                    messages.Warn(
                        $"Removed the ApplicationInsights section from {name}: {Why}. The runtime sets the exporter's "
                            + "settings, so the instrumentation key or connection string it held is no longer read."
                    );
                }
            },
            notRemoved: (messages, name) => NotRemoved(messages, name, "the ApplicationInsights section")
        );

        var logging = await AppSettingsPropertyRemoval.Migrate(
            appFolder,
            ["Logging", "ApplicationInsights"],
            removed: (messages, name, value) =>
                messages.Warn(
                    $"Removed Logging:ApplicationInsights from {name}{DescribeLogLevel(value)}: v9 has no Application "
                        + "Insights logger provider. The app exports logs from Information over OpenTelemetry, and the "
                        + "runtime decides which levels reach Application Insights. An app setting for that in "
                        + "deployment/app.yaml is planned."
                ),
            notRemoved: (messages, name) => NotRemoved(messages, name, "Logging:ApplicationInsights")
        );

        var otelMessages = new List<UpgradeMessage>();
        foreach (var key in TopLevelOtelKeys(appFolder))
        {
            var result = await AppSettingsPropertyRemoval.Migrate(
                appFolder,
                [key],
                removed: (messages, name, value) =>
                    messages.Warn(
                        $"Removed {key} = {Describe(value)} from {name}: the runtime, and studioctl for a local run, set "
                            + "the OpenTelemetry SDK's OTEL_* settings as environment variables, which override the file. "
                            + "The collectors set the environment's name (deployment.environment.name)."
                    ),
                notRemoved: (messages, name) => NotRemoved(messages, name, key)
            );
            otelMessages.AddRange(result.Messages);
        }

        return new MigrationResult([
            .. useOpenTelemetry.Messages,
            .. useCollector.Messages,
            .. applicationInsights.Messages,
            .. logging.Messages,
            .. otelMessages,
        ]);
    }

    /// <summary>
    /// The top-level <c>OTEL_*</c> keys in any of the appsettings files, once per spelling that differs other than in
    /// case. The OpenTelemetry SDK reads them from configuration, so an app could set them in a file.
    /// </summary>
    private static IReadOnlyList<string> TopLevelOtelKeys(string appFolder)
    {
        var keys = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var file in Directory.EnumerateFiles(appFolder, "appsettings*.json").Order(StringComparer.Ordinal))
        {
            try
            {
                var (text, _) = Utf8TextFile.Decode(File.ReadAllBytes(file));
                var root = JsonNode.Parse(
                    text,
                    documentOptions: new JsonDocumentOptions
                    {
                        AllowTrailingCommas = true,
                        CommentHandling = JsonCommentHandling.Skip,
                    }
                );
                if (root is not JsonObject properties)
                    continue;
                foreach (var (key, _) in properties)
                {
                    if (key.StartsWith("OTEL_", StringComparison.OrdinalIgnoreCase))
                        keys.Add(key);
                }
            }
            catch (Exception exception)
                when (exception is JsonException or ArgumentException or System.Text.DecoderFallbackException)
            {
                // Not JSON, or not UTF-8: not ours to rewrite.
            }
        }

        return [.. keys];
    }

    private static void NotRemoved(List<UpgradeMessage> messages, string name, string setting) =>
        messages.Todo(
            $"Remove {setting} from {name}: {Why}, so v9 no longer reads it, but it could not be removed automatically."
        );

    private static string Describe(JsonNode? value) => value?.ToJsonString() ?? "null";

    /// <summary>Whether the section holds nothing but the template's placeholder values.</summary>
    private static bool IsTemplatePlaceholder(JsonNode? value) =>
        value is JsonObject section
        && section.All(property =>
            property.Value is JsonValue v
            && v.TryGetValue<string>(out var text)
            && (string.IsNullOrWhiteSpace(text) || text.Equals(TemplatePlaceholder, StringComparison.OrdinalIgnoreCase))
        );

    /// <summary>The default level the section had, such as " (Default was Information)", or nothing.</summary>
    private static string DescribeLogLevel(JsonNode? value)
    {
        var logLevel =
            (value as JsonObject)
                ?.FirstOrDefault(p => p.Key.Equals("LogLevel", StringComparison.OrdinalIgnoreCase))
                .Value as JsonObject;
        var level = logLevel?.FirstOrDefault(p => p.Key.Equals("Default", StringComparison.OrdinalIgnoreCase)).Value;
        return level is JsonValue v && v.TryGetValue<string>(out var text) ? $" (Default was {text})" : "";
    }
}
