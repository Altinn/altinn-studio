using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Integration.Tests;

internal sealed class StudioctlEnvironmentLease : IAsyncDisposable
{
    private static readonly SemaphoreSlim _lock = new(1, 1);
    private static int _references;
    private static bool _startedByFixture;

    private readonly ILogger _logger;
    private bool _disposed;

    private StudioctlEnvironmentLease(ILogger logger)
    {
        _logger = logger;
    }

    public static async Task<StudioctlEnvironmentLease> Acquire(ILogger logger, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_references == 0)
            {
                try
                {
                    // This lease only avoids repeated env up/down when test classes overlap in parallel.
                    // If classes run sequentially, the count falls back to zero between classes.
                    var status = await GetStatus(logger, cancellationToken);
                    if (!status.Running)
                    {
                        _startedByFixture = !status.AnyRunning;
                        logger.LogInformation("Starting localtest with studioctl env up");
                        await Run("env up --detach", logger, cancellationToken);
                    }
                    else
                    {
                        _startedByFixture = false;
                        logger.LogInformation("Reusing running studioctl localtest environment");
                    }
                }
                catch
                {
                    await StopStartedResources(logger, throwOnFailure: false);
                    _startedByFixture = false;
                    throw;
                }
            }

            _references++;
            return new StudioctlEnvironmentLease(logger);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;

        await _lock.WaitAsync(CancellationToken.None);
        try
        {
            _references--;
            if (_references != 0)
                return;

            await StopStartedResources(_logger, throwOnFailure: true);
            _startedByFixture = false;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<string> GetLogs(CancellationToken cancellationToken)
    {
        return await RunForOutput(_logger, cancellationToken, "env", "logs", "--follow=false");
    }

    private static async Task<StudioctlStatus> GetStatus(ILogger logger, CancellationToken cancellationToken)
    {
        var result = await new Command(
            StudioctlCommand,
            "env status --json",
            ModuleInitializer.GetSolutionDirectory(),
            logger,
            CancellationToken: cancellationToken
        );

        return System.Text.Json.JsonSerializer.Deserialize<StudioctlStatus>(result.StdOut)
            ?? throw new InvalidOperationException("studioctl env status returned empty JSON");
    }

    private static async Task Run(string arguments, ILogger logger, CancellationToken cancellationToken)
    {
        await new Command(
            StudioctlCommand,
            arguments,
            ModuleInitializer.GetSolutionDirectory(),
            logger,
            CancellationToken: cancellationToken
        );
    }

    private static async Task<string> RunForOutput(
        ILogger logger,
        CancellationToken cancellationToken,
        params string[] arguments
    )
    {
        using var process = new System.Diagnostics.Process();
        process.StartInfo.FileName = StudioctlCommand;
        process.StartInfo.WorkingDirectory = ModuleInitializer.GetSolutionDirectory();
        process.StartInfo.RedirectStandardOutput = true;
        process.StartInfo.RedirectStandardError = true;
        process.StartInfo.UseShellExecute = false;
        process.StartInfo.CreateNoWindow = true;
        foreach (var argument in arguments)
            process.StartInfo.ArgumentList.Add(argument);

        if (!process.Start())
            throw new InvalidOperationException("Failed to start studioctl");

        string stdout;
        string stderr;
        try
        {
            var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
            var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);
            stdout = await stdoutTask;
            stderr = await stderrTask;
        }
        catch (OperationCanceledException)
        {
            TryKill(process);
            throw;
        }

        if (!string.IsNullOrWhiteSpace(stderr))
            logger.LogError("studioctl {Arguments} stderr: {StdErr}", string.Join(' ', arguments), stderr.Trim());

        if (process.ExitCode != 0)
            throw new InvalidOperationException(
                $"studioctl {string.Join(' ', arguments)} failed with exit code {process.ExitCode}.\nstdout:\n{stdout}\nstderr:\n{stderr}"
            );

        return stdout;
    }

    private static void TryKill(System.Diagnostics.Process process)
    {
        try
        {
            if (!process.HasExited)
                process.Kill(entireProcessTree: true);
        }
        catch { }
    }

    private static async Task StopStartedResources(ILogger logger, bool throwOnFailure)
    {
        if (_startedByFixture)
        {
            logger.LogInformation("Stopping localtest with studioctl env down");
            await TryRun("env down", logger, throwOnFailure);
        }
    }

    private static async Task TryRun(string arguments, ILogger logger, bool throwOnFailure)
    {
        try
        {
            await Run(arguments, logger, CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "studioctl {Arguments} failed", arguments);
            if (throwOnFailure)
                throw;
        }
    }

    internal static string StudioctlCommand =>
        Environment.GetEnvironmentVariable("TEST_STUDIOCTL_COMMAND") ?? "studioctl";

    private sealed record StudioctlStatus(
        [property: JsonPropertyName("running")] bool Running,
        [property: JsonPropertyName("anyRunning")] bool AnyRunning
    );
}

internal sealed class StudioctlAppProcess : IAsyncDisposable
{
    private static readonly TimeSpan _stopTimeout = TimeSpan.FromSeconds(10);

    private readonly ILogger _logger;

    private StudioctlAppProcess(ILogger logger, string appDirectory, int processId, Uri baseUri, string? logPath)
    {
        _logger = logger;
        AppDirectory = appDirectory;
        ProcessId = processId;
        BaseUri = baseUri;
        LogPath = logPath;
    }

    public string AppDirectory { get; }
    public int ProcessId { get; }
    public Uri BaseUri { get; }
    public string? LogPath { get; }

    public bool IsRunning()
    {
        try
        {
            var process = System.Diagnostics.Process.GetProcessById(ProcessId);
            return !process.HasExited;
        }
        catch (ArgumentException)
        {
            return false;
        }
    }

    public static async Task<StudioctlAppProcess> Start(
        string appDirectory,
        string fixtureConfigurationPath,
        string nugetPackagesDirectory,
        ILogger logger,
        CancellationToken cancellationToken
    )
    {
        var result = await RunStudioctl(
            appDirectory,
            fixtureConfigurationPath,
            nugetPackagesDirectory,
            logger,
            cancellationToken,
            "run",
            "--mode",
            "process",
            "--detach",
            "--random-host-port",
            "--json",
            "--path",
            appDirectory
        );

        return ParseRunResult(logger, appDirectory, result.StdOut);
    }

    public static async Task StopByPathBestEffort(string appDirectory, ILogger logger)
    {
        if (!Directory.Exists(appDirectory))
            return;

        try
        {
            await StopByPath(appDirectory, logger);
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "No stale studioctl app stopped for {AppDirectory}", appDirectory);
        }
    }

    private static async Task StopByPath(string appDirectory, ILogger logger)
    {
        await RunStudioctl(
            appDirectory,
            fixtureConfigurationPath: null,
            nugetPackagesDirectory: null,
            logger,
            CancellationToken.None,
            "app",
            "stop",
            "--path",
            appDirectory,
            "--json"
        );
    }

    public IReadOnlyList<string> GetLogLines(int startLine = 0)
    {
        if (string.IsNullOrWhiteSpace(LogPath) || !File.Exists(LogPath))
            return [];

        try
        {
            return ReadLogLines(LogPath, startLine);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read app log {LogPath}", LogPath);
            return [];
        }
    }

    public int GetLogLineCount() => GetLogLines().Count;

    internal static IReadOnlyList<string> ReadLogLines(string path, int startLine = 0)
    {
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
        using var reader = new StreamReader(stream);

        var lines = new List<string>();
        while (reader.ReadLine() is { } line)
            lines.Add(line);

        if (startLine <= 0)
            return lines;
        if (startLine >= lines.Count)
            return [];
        return lines[startLine..];
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            await StopByPath(AppDirectory, _logger);
            return;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "studioctl app stop failed for {AppDirectory}", AppDirectory);
        }

        try
        {
            var process = System.Diagnostics.Process.GetProcessById(ProcessId);
            process.Kill(entireProcessTree: true);
            using var timeout = new CancellationTokenSource(_stopTimeout);
            await process.WaitForExitAsync(timeout.Token);
        }
        catch (ArgumentException)
        {
            // Already exited.
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogWarning(ex, "Timed out waiting for app process {ProcessId} to stop", ProcessId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to stop app process {ProcessId}", ProcessId);
        }
    }

    private static StudioctlAppProcess ParseRunResult(ILogger logger, string appDirectory, string stdout)
    {
        // The harness always starts apps with --json. Treat non-JSON output as a studioctl contract break.
        var json = stdout.Trim();
        if (!json.StartsWith('{'))
            throw new InvalidOperationException($"Could not parse studioctl run JSON.\nstdout:\n{stdout}");

        var result =
            System.Text.Json.JsonSerializer.Deserialize<RunJsonResult>(json)
            ?? throw new InvalidOperationException("studioctl run returned empty JSON");
        if (result.ProcessId <= 0)
            throw new InvalidOperationException("studioctl run JSON did not include a processId");
        var url = result.Url ?? result.BaseUrl;
        if (string.IsNullOrWhiteSpace(url) || !Uri.TryCreate(url, UriKind.Absolute, out var uri))
            throw new InvalidOperationException("studioctl run JSON did not include a valid url");

        return new StudioctlAppProcess(logger, appDirectory, result.ProcessId, uri, result.LogPath);
    }

    private static void TryKill(System.Diagnostics.Process process)
    {
        try
        {
            if (!process.HasExited)
                process.Kill(entireProcessTree: true);
        }
        catch { }
    }

    private static async Task<ProcessResult> RunStudioctl(
        string workingDirectory,
        string? fixtureConfigurationPath,
        string? nugetPackagesDirectory,
        ILogger logger,
        CancellationToken cancellationToken,
        params string[] arguments
    )
    {
        using var process = new System.Diagnostics.Process();
        process.StartInfo.FileName = StudioctlEnvironmentLease.StudioctlCommand;
        process.StartInfo.WorkingDirectory = workingDirectory;
        process.StartInfo.RedirectStandardOutput = true;
        process.StartInfo.RedirectStandardError = true;
        process.StartInfo.UseShellExecute = false;
        process.StartInfo.CreateNoWindow = true;
        if (fixtureConfigurationPath is not null)
            process.StartInfo.Environment["AppFixture__ConfigurationPath"] = fixtureConfigurationPath;
        if (nugetPackagesDirectory is not null)
            process.StartInfo.Environment["NUGET_PACKAGES"] = nugetPackagesDirectory;
        foreach (var argument in arguments)
            process.StartInfo.ArgumentList.Add(argument);

        if (!process.Start())
            throw new InvalidOperationException("Failed to start studioctl");

        string stdout;
        string stderr;
        try
        {
            var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
            var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);
            stdout = await stdoutTask;
            stderr = await stderrTask;
        }
        catch (OperationCanceledException)
        {
            TryKill(process);
            await StopByPathBestEffort(workingDirectory, logger);
            throw;
        }

        if (!string.IsNullOrWhiteSpace(stdout))
            logger.LogInformation("studioctl stdout: {StdOut}", stdout.Trim());
        if (!string.IsNullOrWhiteSpace(stderr))
            logger.LogError("studioctl stderr: {StdErr}", stderr.Trim());

        if (process.ExitCode != 0)
            throw new InvalidOperationException(
                $"studioctl failed with exit code {process.ExitCode}.\nstdout:\n{stdout}\nstderr:\n{stderr}"
            );

        return new ProcessResult(stdout);
    }

    private sealed record RunJsonResult(
        [property: JsonPropertyName("processId")] int ProcessId,
        [property: JsonPropertyName("url")] string? Url,
        [property: JsonPropertyName("baseUrl")] string? BaseUrl,
        [property: JsonPropertyName("logPath")] string? LogPath
    );

    private sealed record ProcessResult(string StdOut);
}
