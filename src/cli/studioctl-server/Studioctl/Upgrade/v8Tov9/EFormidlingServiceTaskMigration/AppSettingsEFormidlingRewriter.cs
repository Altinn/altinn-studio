using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.EFormidlingServiceTaskMigration;

/// <summary>
/// Effective legacy eFormidling enablement per hosting environment, computed from the
/// <c>AppSettings:EnableEFormidling</c> flag across appsettings files. The v9 BPMN configuration
/// expresses the same gate with <c>&lt;altinn:disabled env="..."&gt;</c> elements.
/// </summary>
internal sealed record EFormidlingGate(bool Development, bool Staging, bool Production)
{
    public bool EnabledAnywhere => Development || Staging || Production;

    public bool EnabledEverywhere => Development && Staging && Production;

    /// <summary>Hosting environment names (BPMN 'env' attribute values) where eFormidling was off.</summary>
    public IReadOnlyList<string> DisabledEnvironments()
    {
        var disabled = new List<string>(3);
        if (!Development)
            disabled.Add("development");
        if (!Staging)
            disabled.Add("staging");
        if (!Production)
            disabled.Add("production");
        return disabled;
    }
}

/// <summary>
/// Reads the deprecated <c>AppSettings:EnableEFormidling</c> flag from the app's appsettings files
/// and strips it once the gate has been migrated to the BPMN service task configuration. In the
/// legacy backend the flag decided whether the eFormidling shipment was sent at all; the setting no
/// longer exists in v9.
/// </summary>
internal sealed class AppSettingsEFormidlingRewriter
{
    private readonly string _appFolder;
    private readonly List<string> _warnings = new();

    // ASPNETCORE_ENVIRONMENT names as they map onto the Altinn hosting environments used by the
    // BPMN 'env' attribute. Keep in sync with AltinnEnvironments in Altinn.App.Core.
    private static readonly Dictionary<string, string> _environmentBuckets = new(StringComparer.OrdinalIgnoreCase)
    {
        ["development"] = "development",
        ["dev"] = "development",
        ["local"] = "development",
        ["localtest"] = "development",
        ["staging"] = "staging",
        ["test"] = "staging",
        ["at22"] = "staging",
        ["at23"] = "staging",
        ["at24"] = "staging",
        ["tt02"] = "staging",
        ["yt01"] = "staging",
        ["production"] = "production",
        ["prod"] = "production",
        ["produksjon"] = "production",
    };

    public AppSettingsEFormidlingRewriter(string appFolder)
    {
        _appFolder = appFolder;
    }

    public IReadOnlyList<string> GetWarnings() => _warnings;

    /// <summary>
    /// Computes the effective enablement per hosting environment: an environment-specific
    /// appsettings file wins over the base appsettings.json; an unset flag means disabled (the
    /// legacy backend defaulted to not sending).
    /// </summary>
    public EFormidlingGate ReadGate()
    {
        var baseValue = ReadFlag(Path.Combine(_appFolder, "appsettings.json")) ?? false;
        var buckets = new Dictionary<string, bool?>(StringComparer.Ordinal)
        {
            ["development"] = null,
            ["staging"] = null,
            ["production"] = null,
        };

        foreach (var file in EnumerateAppSettingsFiles())
        {
            var environmentName = GetEnvironmentName(file);
            if (environmentName is null)
                continue; // The base appsettings.json, already handled.

            var value = ReadFlag(file);
            if (value is null)
                continue;

            if (!_environmentBuckets.TryGetValue(environmentName, out var bucket))
            {
                if (value != baseValue)
                {
                    _warnings.Add(
                        $"{Path.GetFileName(file)} sets AppSettings:EnableEFormidling to {value} but the "
                            + $"'{environmentName}' environment does not map to a known Altinn hosting environment. "
                            + "The value was ignored - adjust <altinn:disabled> on the eFormidling service task "
                            + "manually if needed."
                    );
                }
                continue;
            }

            if (buckets[bucket] is { } existing && existing != value)
            {
                _warnings.Add(
                    $"Multiple appsettings files disagree about AppSettings:EnableEFormidling for the "
                        + $"'{bucket}' hosting environment. Treated it as enabled - adjust <altinn:disabled> on "
                        + "the eFormidling service task manually if needed."
                );
                buckets[bucket] = true;
                continue;
            }

            buckets[bucket] = value;
        }

        return new EFormidlingGate(
            buckets["development"] ?? baseValue,
            buckets["staging"] ?? baseValue,
            buckets["production"] ?? baseValue
        );
    }

    /// <summary>
    /// Removes every whole-line <c>"EnableEFormidling": true/false</c> property from the app's
    /// appsettings files, preserving the surrounding formatting (same approach as the
    /// enablePdfCreation migration). Files where the property has unexpected formatting are left
    /// unchanged with a warning. Verifies each result still parses.
    /// </summary>
    public async Task StripEnableEFormidling()
    {
        foreach (var file in EnumerateAppSettingsFiles())
        {
            var original = await File.ReadAllTextAsync(file);
            if (!original.Contains("\"EnableEFormidling\"", StringComparison.Ordinal))
                continue;

            var lines = original.Split('\n');
            var kept = new List<string>(lines.Length);

            for (var i = 0; i < lines.Length; i++)
            {
                var line = lines[i];
                if (!IsEnableEFormidlingLine(line))
                {
                    if (line.Contains("\"EnableEFormidling\"", StringComparison.Ordinal))
                    {
                        _warnings.Add(
                            $"Found EnableEFormidling on a line with unexpected formatting in "
                                + $"{Path.GetFileName(file)} (line {i + 1}); left it in place - the setting has no "
                                + "effect in v9 and can be removed manually."
                        );
                    }
                    kept.Add(line);
                    continue;
                }

                var nextMeaningful = NextMeaningfulLine(lines, i);
                if (nextMeaningful.StartsWith('}') && kept.Count > 0)
                {
                    var prev = kept[^1];
                    var content = prev.TrimEnd();
                    if (content.EndsWith(','))
                        kept[^1] = content[..^1] + prev[content.Length..];
                }
            }

            var result = string.Join('\n', kept);
            if (string.Equals(result, original, StringComparison.Ordinal))
                continue;

            try
            {
                using var _ = JsonDocument.Parse(result);
            }
            catch (JsonException ex)
            {
                _warnings.Add(
                    $"Removing EnableEFormidling from {Path.GetFileName(file)} would produce invalid JSON "
                        + $"({ex.Message}). Left the file unchanged - the setting has no effect in v9 and can be "
                        + "removed manually."
                );
                continue;
            }

            await File.WriteAllTextAsync(file, result);
        }
    }

    private IEnumerable<string> EnumerateAppSettingsFiles()
    {
        if (!Directory.Exists(_appFolder))
            return [];

        return Directory.EnumerateFiles(_appFolder, "appsettings*.json", SearchOption.TopDirectoryOnly);
    }

    /// <summary>Returns the environment part of appsettings.{Environment}.json, or null for appsettings.json.</summary>
    private static string? GetEnvironmentName(string file)
    {
        var name = Path.GetFileName(file);
        const string prefix = "appsettings.";
        const string suffix = ".json";
        if (name.Length <= prefix.Length + suffix.Length)
            return null;

        return name[prefix.Length..^suffix.Length];
    }

    private bool? ReadFlag(string file)
    {
        if (!File.Exists(file))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(file));
            if (
                doc.RootElement.ValueKind != JsonValueKind.Object
                || !doc.RootElement.TryGetProperty("AppSettings", out var appSettings)
                || appSettings.ValueKind != JsonValueKind.Object
                || !appSettings.TryGetProperty("EnableEFormidling", out var flag)
            )
            {
                return null;
            }

            return flag.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                // The configuration binder also accepts string values.
                JsonValueKind.String when bool.TryParse(flag.GetString(), out var parsed) => parsed,
                _ => WarnUnparsableFlag(file, flag),
            };
        }
        catch (JsonException ex)
        {
            _warnings.Add($"Could not parse {Path.GetFileName(file)} ({ex.Message}); ignored it.");
            return null;
        }
    }

    private bool? WarnUnparsableFlag(string file, JsonElement flag)
    {
        _warnings.Add(
            $"AppSettings:EnableEFormidling in {Path.GetFileName(file)} has an unexpected value "
                + $"({flag.GetRawText()}); treated it as unset."
        );
        return null;
    }

    private static string NextMeaningfulLine(string[] lines, int from)
    {
        for (var i = from + 1; i < lines.Length; i++)
        {
            var trimmed = lines[i].TrimStart();
            if (trimmed.Length > 0)
                return trimmed;
        }

        return string.Empty;
    }

    private static bool IsEnableEFormidlingLine(string line)
    {
        // Match a whole line of the form `"EnableEFormidling": true,` (value true/false, quoted or
        // not, comma optional) and nothing else, so removing the line cannot take other content.
        var trimmed = line.Trim();
        if (!trimmed.StartsWith("\"EnableEFormidling\"", StringComparison.Ordinal))
            return false;

        var rest = trimmed["\"EnableEFormidling\"".Length..].TrimStart();
        if (!rest.StartsWith(':'))
            return false;

        rest = rest[1..].TrimStart().TrimEnd(',').TrimEnd().Trim('"');
        return rest is "true" or "false";
    }
}
