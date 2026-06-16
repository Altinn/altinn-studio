using System.Diagnostics;
using System.Text.Json;

namespace Altinn.App.Api.Extensions;

internal static class StudioctlLocalConfiguration
{
    private const string StudioctlAppRunEnvironmentVariable = "STUDIOCTL_APP_RUN";
    private static readonly TimeSpan _defaultTimeout = TimeSpan.FromSeconds(3);
    private static readonly IReadOnlyDictionary<string, string?> _emptyConfiguration =
        new Dictionary<string, string?>();

    internal static void AddIfAvailable(IConfigurationBuilder configBuilder, IHostEnvironment hostEnvironment)
    {
        try
        {
            AddIfAvailableCore(configBuilder, hostEnvironment);
        }
        catch (Exception ex)
        {
            WriteWarning("Failed to import local studioctl app configuration.", ex);
        }
    }

    private static void AddIfAvailableCore(IConfigurationBuilder configBuilder, IHostEnvironment hostEnvironment)
    {
        if (configBuilder is null || !ShouldAdd(hostEnvironment))
        {
            return;
        }

        string contentRootPath = hostEnvironment.ContentRootPath;
        IReadOnlyDictionary<string, string?> env = TryReadStudioctlEnvironment(
            FindProjectPath(contentRootPath) ?? contentRootPath,
            _defaultTimeout
        );
        if (env.Count == 0)
        {
            return;
        }

        configBuilder.AddInMemoryCollection(NormalizeConfigurationKeys(env));
    }

    internal static bool ShouldAdd(IHostEnvironment? hostEnvironment)
    {
        if (hostEnvironment is null)
        {
            return false;
        }

        if (!hostEnvironment.IsDevelopment())
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(StudioctlAppRunEnvironmentVariable)))
        {
            return false;
        }

        string contentRootPath = hostEnvironment.ContentRootPath;
        return !string.IsNullOrWhiteSpace(contentRootPath) && Directory.Exists(contentRootPath);
    }

    internal static IReadOnlyDictionary<string, string?> TryReadStudioctlEnvironment(
        string projectOrRootPath,
        TimeSpan timeout
    )
    {
        // Contract with studioctl: `studioctl app env --json` returns a flat JSON object
        // where keys are environment variable names and values are environment variable values.
        return
            TryRunStudioctlEnvironmentCommand(projectOrRootPath, timeout, out string json)
            && TryParseEnvironmentJson(json, out Dictionary<string, string?> values)
            ? values
            : _emptyConfiguration;
    }

    internal static bool TryParseEnvironmentJson(string json, out Dictionary<string, string?> values)
    {
        values = [];

        if (string.IsNullOrWhiteSpace(json))
        {
            return false;
        }

        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(json);
        }
        catch (Exception ex)
        {
            WriteWarning("studioctl app env returned invalid JSON.", ex);
            return false;
        }
        using (document)
        {
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            values = new(StringComparer.OrdinalIgnoreCase);
            foreach (JsonProperty property in document.RootElement.EnumerateObject())
            {
                if (property.Value.ValueKind == JsonValueKind.String)
                {
                    values[property.Name] = property.Value.GetString();
                }
            }
        }

        return true;
    }

    internal static Dictionary<string, string?> NormalizeConfigurationKeys(IReadOnlyDictionary<string, string?> values)
    {
        Dictionary<string, string?> normalized = new(StringComparer.OrdinalIgnoreCase);
        foreach ((string key, string? value) in values)
        {
            normalized[key.Replace("__", ":", StringComparison.Ordinal)] = value;
        }

        return normalized;
    }

    internal static ProcessStartInfo CreateStartInfo(string projectOrRootPath)
    {
        ProcessStartInfo startInfo = new()
        {
            FileName = "studioctl",
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        startInfo.ArgumentList.Add("app");
        startInfo.ArgumentList.Add("env");
        startInfo.ArgumentList.Add("--json");
        startInfo.ArgumentList.Add("--project");
        startInfo.ArgumentList.Add(projectOrRootPath);

        return startInfo;
    }

    private static bool TryRunStudioctlEnvironmentCommand(string projectOrRootPath, TimeSpan timeout, out string output)
    {
        output = string.Empty;
        using Process process = new() { StartInfo = CreateStartInfo(projectOrRootPath) };

        if (!process.Start())
        {
            WriteWarning("studioctl app env did not start.");
            return false;
        }

        if (!process.WaitForExit(timeout))
        {
            TryKill(process);
            WriteWarning($"studioctl app env timed out after {timeout.TotalSeconds} seconds.");
            return false;
        }

        output = process.StandardOutput.ReadToEnd();
        string errorOutput = process.StandardError.ReadToEnd().Trim();

        if (process.ExitCode == 0)
        {
            return true;
        }

        string details = string.IsNullOrWhiteSpace(errorOutput) ? "." : $": {errorOutput}";
        WriteWarning($"studioctl app env exited with code {process.ExitCode}{details}");
        return false;
    }

    private static string? FindProjectPath(string contentRootPath)
    {
        return Directory
            .EnumerateFiles(contentRootPath, "*.csproj", SearchOption.TopDirectoryOnly)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault();
    }

    private static void TryKill(Process process)
    {
        try
        {
            process.Kill(entireProcessTree: true);
        }
        catch (Exception ex)
        {
            WriteWarning("Failed to stop timed out studioctl app env process.", ex);
        }
    }

    private static void WriteWarning(string message, Exception? exception = null)
    {
        if (exception is null)
        {
            Console.Error.WriteLine($"Warning: {message}");
            return;
        }

        Console.Error.WriteLine($"Warning: {message}{Environment.NewLine}{exception}");
    }
}
