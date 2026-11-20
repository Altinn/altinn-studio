using System.ComponentModel;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using Altinn.App.Core.Internal;

namespace Altinn.App.Api.Extensions;

/// <summary>
/// <para>Imports the environment studioctl would have given the app, for an app studioctl did not start. Every
/// local run of a v9 app is configured by studioctl; when <c>studioctl app run</c> is not the parent process -
/// <c>dotnet run</c>, an IDE - this runs <c>studioctl app env --json</c> for the project and adds what it
/// prints to the app's configuration, so the app is configured the same way either way.</para>
/// <para>Development only, and skipped when <see cref="StudioctlAppEnvironment.AppRunKey"/> is already in the
/// process environment. A studioctl that is missing or fails leaves the configuration as it was, apart from
/// <see cref="StudioctlAppEnvironment.ImportFailureKey"/>, which says why: an app is free to run on its own
/// configuration, and when it cannot, the startup check that finds a value missing names the reason, in
/// studioctl's own words where it gave any. What the libraries read out of what is imported is
/// <see cref="StudioctlAppEnvironment"/>'s own key, and the <c>RUNTIME_APP_*</c> variables that say where the
/// platform provisioned the app's secrets.</para>
/// </summary>
internal static class StudioctlLocalConfiguration
{
    // The app cannot start without what studioctl prints, so the limit only decides how long a studioctl that
    // hangs holds the app's startup. It is not tighter than studioctl's own work: `app env` gives its check for
    // an app-localtest container up to 2 seconds alone, after starting the process and finding the container
    // runtime, which on a cold start on Windows (first run of the executable, Docker Desktop or podman) can take
    // seconds more.
    private static readonly TimeSpan _defaultTimeout = TimeSpan.FromSeconds(10);

    internal static void AddIfAvailable(IConfigurationBuilder configBuilder, IHostEnvironment hostEnvironment)
    {
        if (configBuilder is null || !ShouldAdd(hostEnvironment))
        {
            return;
        }

        string contentRootPath = hostEnvironment.ContentRootPath;
        StudioctlImport import;
        try
        {
            import = Import(CreateStartInfo(FindProjectPath(contentRootPath) ?? contentRootPath), _defaultTimeout);
        }
        catch (Exception ex)
        {
            import = StudioctlImport.Failed($"'studioctl app env' could not be run: {ex.Message}");
        }

        configBuilder.AddInMemoryCollection(
            import.Failure is { } failure
                ? new Dictionary<string, string?> { [StudioctlAppEnvironment.ImportFailureKey] = failure }
                : NormalizeConfigurationKeys(import.Values)
        );
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

    /// <summary>
    /// Runs <paramref name="startInfo"/>, <c>studioctl app env --json</c> outside tests, and returns the
    /// environment it printed, or why there is none.
    /// </summary>
    internal static StudioctlImport Import(ProcessStartInfo startInfo, TimeSpan timeout)
    {
        // Contract with studioctl: `studioctl app env --json` returns a flat JSON object where keys are
        // environment variable names and values are environment variable values - the same environment
        // `studioctl app run` starts the app with (see StudioctlAppEnvironment).
        if (!TryRunStudioctlEnvironmentCommand(startInfo, timeout, out string json, out string? failure))
        {
            return StudioctlImport.Failed(failure);
        }

        return TryParseEnvironmentJson(json, out Dictionary<string, string?> values)
            ? StudioctlImport.Imported(values)
            : StudioctlImport.Failed("'studioctl app env' printed something other than a JSON object.");
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
        catch (JsonException)
        {
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
        // studioctl colors its errors whenever NO_COLOR is unset, also into a pipe, and the app shows them as text.
        startInfo.Environment["NO_COLOR"] = "1";

        return startInfo;
    }

    private static bool TryRunStudioctlEnvironmentCommand(
        ProcessStartInfo startInfo,
        TimeSpan timeout,
        out string output,
        [NotNullWhen(false)] out string? failure
    )
    {
        output = string.Empty;
        using Process process = new() { StartInfo = startInfo };

        try
        {
            if (!process.Start())
            {
                failure = "'studioctl app env' did not start.";
                return false;
            }
        }
        catch (Exception ex) when (ex is Win32Exception or InvalidOperationException)
        {
            failure =
                $"studioctl could not be started ({ex.Message}). Have studioctl on PATH, or start the app with "
                + "'studioctl app run'.";
            return false;
        }

        // Read both streams while waiting, so that output larger than the pipe buffer cannot hold the process up.
        Task<string> standardOutput = process.StandardOutput.ReadToEndAsync();
        Task<string> standardError = process.StandardError.ReadToEndAsync();

        if (!process.WaitForExit(timeout))
        {
            TryKill(process);
            failure = $"'studioctl app env' did not finish within {timeout.TotalSeconds} seconds.";
            return false;
        }

        output = standardOutput.GetAwaiter().GetResult();
        string errorOutput = standardError.GetAwaiter().GetResult().Trim();

        if (process.ExitCode == 0)
        {
            failure = null;
            return true;
        }

        failure = string.IsNullOrWhiteSpace(errorOutput)
            ? $"'studioctl app env' exited with code {process.ExitCode}."
            : $"'studioctl app env' exited with code {process.ExitCode}: {errorOutput}";
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
            when (ex is InvalidOperationException or Win32Exception or NotSupportedException or AggregateException)
        {
            // It exited on its own in the meantime, or cannot be stopped; either way the import has failed.
        }
    }
}

/// <summary>
/// What <see cref="StudioctlLocalConfiguration.Import"/> got from studioctl: its environment, or why there is none.
/// </summary>
internal sealed record StudioctlImport(IReadOnlyDictionary<string, string?> Values, string? Failure)
{
    internal static StudioctlImport Imported(IReadOnlyDictionary<string, string?> values) => new(values, null);

    internal static StudioctlImport Failed(string failure) => new(new Dictionary<string, string?>(), failure);
}
