using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal static class LaunchSettingsMigration
{
    private const string AspNetCoreEnvironment = "ASPNETCORE_ENVIRONMENT";
    private const string DevelopmentEnvironment = "Development";
    private const string LocalAltinnHost = "local.altinn.cloud";
    private const int LocalAltinnPort = 8000;
    private static readonly string _applicationUrl = $"http://{LocalAltinnHost}:{LocalAltinnPort}";
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new() { WriteIndented = true };

    /// <summary>Brings <c>Properties/launchSettings.json</c> in line with what a v9 app needs.</summary>
    /// <returns>Whether the file changed, so the caller can report accurately.</returns>
    internal static async Task<bool> Migrate(string projectFile)
    {
        var appDirectory = Path.GetDirectoryName(projectFile);
        if (string.IsNullOrWhiteSpace(appDirectory))
            throw new InvalidOperationException($"Unable to resolve app directory from project file: {projectFile}");

        var propertiesDirectory = Path.Combine(appDirectory, "Properties");
        Directory.CreateDirectory(propertiesDirectory);

        var launchSettingsFile = Path.Combine(propertiesDirectory, "launchSettings.json");
        var original = File.Exists(launchSettingsFile) ? await File.ReadAllTextAsync(launchSettingsFile) : null;
        var root = original is null ? new JsonObject() : ParseLaunchSettings(original, launchSettingsFile);

        Migrate(root);

        var migrated = root.ToJsonString(_jsonSerializerOptions) + Environment.NewLine;
        if (string.Equals(original, migrated, StringComparison.Ordinal))
            return false;

        await File.WriteAllTextAsync(launchSettingsFile, migrated);
        return true;
    }

    private static JsonObject ParseLaunchSettings(string content, string launchSettingsFile)
    {
        if (string.IsNullOrWhiteSpace(content))
            return new JsonObject();

        try
        {
            var root = JsonNode.Parse(content) as JsonObject;
            if (root is not null)
                return root;

            UpgradeResultWriter.WriteLine(
                $"Warning: {launchSettingsFile} does not contain a JSON object. Writing standard launch settings."
            );
            return new JsonObject();
        }
        catch (JsonException)
        {
            UpgradeResultWriter.WriteLine(
                $"Warning: Could not parse {launchSettingsFile}. Writing standard launch settings."
            );
            return new JsonObject();
        }
    }

    private static void Migrate(JsonObject root)
    {
        root.Remove("iisSettings");

        var profiles = root["profiles"] as JsonObject;
        if (profiles is null)
        {
            profiles = new JsonObject();
            root["profiles"] = profiles;
        }

        RemoveIisProfiles(profiles);
        var appProfile = ResolveAppProfile(profiles);

        appProfile["applicationUrl"] = _applicationUrl;
        if (!appProfile.ContainsKey("dotnetRunMessages"))
            appProfile["dotnetRunMessages"] = true;
    }

    private static void RemoveIisProfiles(JsonObject profiles)
    {
        var profileNames = profiles
            .Where(profile => IsIisProfile(profile.Key, profile.Value as JsonObject))
            .Select(profile => profile.Key)
            .ToList();

        foreach (var profileName in profileNames)
        {
            profiles.Remove(profileName);
        }
    }

    private static bool IsIisProfile(string profileName, JsonObject? profile)
    {
        if (profileName.Contains("IIS", StringComparison.OrdinalIgnoreCase))
            return true;

        return string.Equals(GetString(profile?["commandName"]), "IISExpress", StringComparison.Ordinal);
    }

    private static JsonObject ResolveAppProfile(JsonObject profiles)
    {
        if (profiles["App"] is JsonObject appProfile)
        {
            profiles.Remove("AppRef");
            return appProfile;
        }

        if (profiles["AppRef"] is JsonObject appRefProfile)
        {
            profiles.Remove("AppRef");
            profiles["App"] = appRefProfile;
            return appRefProfile;
        }

        var newAppProfile = new JsonObject
        {
            ["commandName"] = "Project",
            ["dotnetRunMessages"] = true,
            ["launchBrowser"] = false,
            ["environmentVariables"] = new JsonObject { [AspNetCoreEnvironment] = DevelopmentEnvironment },
        };
        profiles["App"] = newAppProfile;
        return newAppProfile;
    }

    private static string? GetString(JsonNode? node)
    {
        return node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;
    }
}
