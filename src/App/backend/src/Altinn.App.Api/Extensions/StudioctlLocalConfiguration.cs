using System.Diagnostics;
using System.Text.Json;
using Altinn.App.Core.Internal;

namespace Altinn.App.Api.Extensions;

/// <summary>
/// <para>Imports the environment studioctl would have given the app, for an app studioctl did not start. Every
/// local run of a v9 app is configured by studioctl; when <c>studioctl app run</c> is not the parent process -
/// <c>dotnet run</c>, an IDE - this runs <c>studioctl app env --json</c> for the project and adds what it
/// prints to the app's configuration, so the app is configured the same way either way.</para>
/// <para>Development only, and skipped when <see cref="StudioctlAppEnvironment.AppRunKey"/> is already in the
/// process environment. A studioctl that is missing or fails leaves the configuration as it was, with the
/// failure written to the debug output and nothing else: an app is free to run on its own configuration.
/// The keys the libraries read out of what is imported are listed on <see cref="StudioctlAppEnvironment"/>.</para>
/// </summary>
internal static class StudioctlLocalConfiguration
{
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
            WriteDebug("Failed to import local studioctl app configuration.", ex);
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

        if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(StudioctlAppEnvironment.AppRunKey)))
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
        // Contract with studioctl: `studioctl app env --json` returns a flat JSON object where keys are
        // environment variable names and values are environment variable values - the same environment
        // `studioctl app run` starts the app with (see StudioctlAppEnvironment).
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
            WriteDebug("studioctl app env returned invalid JSON.", ex);
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
            WriteDebug("studioctl app env did not start.");
            return false;
        }

        if (!process.WaitForExit(timeout))
        {
            TryKill(process);
            WriteDebug($"studioctl app env timed out after {timeout.TotalSeconds} seconds.");
            return false;
        }

        output = process.StandardOutput.ReadToEnd();
        string errorOutput = process.StandardError.ReadToEnd().Trim();

        if (process.ExitCode == 0)
        {
            return true;
        }

        string details = string.IsNullOrWhiteSpace(errorOutput) ? "." : $": {errorOutput}";
        WriteDebug($"studioctl app env exited with code {process.ExitCode}{details}");
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
            WriteDebug("Failed to stop timed out studioctl app env process.", ex);
        }
    }

    [Conditional("DEBUG")]
    private static void WriteDebug(string message, Exception? exception = null)
    {
        if (exception is null)
        {
            Debug.WriteLine(message);
            return;
        }

        Debug.WriteLine($"{message}{Environment.NewLine}{exception}");
    }
}
