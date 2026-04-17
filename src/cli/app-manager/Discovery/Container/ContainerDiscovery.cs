using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.AppManager.Platform;

namespace Altinn.Studio.AppManager.Discovery.Container;

internal sealed class ContainerDiscovery : IAppDiscovery
{
    private static readonly TimeSpan _timeout = TimeSpan.FromSeconds(3);
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    private readonly string? _studioctlPath;
    private readonly ILogger<ContainerDiscovery> _logger;

    public ContainerDiscovery(IConfiguration configuration, ILogger<ContainerDiscovery> logger)
    {
        _studioctlPath = configuration["Studioctl:Path"];
        _logger = logger;
    }

    public async Task<IReadOnlyList<AppDiscoveryCandidate>> Discover(CancellationToken cancellationToken)
    {
        var studioctlPath = _studioctlPath;
        if (string.IsNullOrWhiteSpace(studioctlPath))
            return [];

        try
        {
            var candidates = await RunStudioctl(studioctlPath, cancellationToken);
            return ToDiscoveryCandidates(candidates);
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            _logger.LogDebug(ex, "Container discovery failed");
            return [];
        }
    }

    private async Task<IReadOnlyList<ContainerCandidate>> RunStudioctl(
        string studioctlPath,
        CancellationToken cancellationToken
    )
    {
        using var process = new System.Diagnostics.Process { StartInfo = ProcessUtil.CreateStartInfo(studioctlPath) };
        process.StartInfo.RedirectStandardOutput = true;
        process.StartInfo.RedirectStandardError = true;
        process.StartInfo.ArgumentList.Add("__app-containers");

        if (!process.Start())
        {
            _logger.LogDebug("Container discovery could not start studioctl");
            return [];
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(_timeout);

        var stdoutTask = process.StandardOutput.ReadToEndAsync(timeout.Token);
        var stderrTask = process.StandardError.ReadToEndAsync(timeout.Token);
        try
        {
            await process.WaitForExitAsync(timeout.Token);
        }
        catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            KillBestEffort(process);
            _logger.LogDebug(ex, "Container discovery timed out");
            return [];
        }

        var stdout = await stdoutTask;
        var stderr = await stderrTask;
        if (process.ExitCode != 0)
        {
            if (_logger.IsEnabled(LogLevel.Debug))
            {
                _logger.LogDebug(
                    "Container discovery exited with code {ExitCode}: {Error}",
                    process.ExitCode,
                    stderr.Trim()
                );
            }
            return [];
        }

        return JsonSerializer.Deserialize<List<ContainerCandidate>>(stdout, _jsonOptions) ?? [];
    }

    private static void KillBestEffort(System.Diagnostics.Process process)
    {
        try
        {
            if (!process.HasExited)
                process.Kill(entireProcessTree: true);
        }
        catch
        {
            // The process may exit between HasExited and Kill.
        }
    }

    private static IReadOnlyList<AppDiscoveryCandidate> ToDiscoveryCandidates(
        IReadOnlyList<ContainerCandidate> candidates
    )
    {
        var result = new List<AppDiscoveryCandidate>(candidates.Count);
        foreach (var candidate in candidates)
            result.AddRange(ToDiscoveryCandidate(candidate));
        return result;
    }

    private static IEnumerable<AppDiscoveryCandidate> ToDiscoveryCandidate(ContainerCandidate candidate)
    {
        if (!AppEndpointUri.TryLoopbackHttp(candidate.HostPort, out var baseUri) || baseUri is null)
            yield break;

        yield return new AppDiscoveryCandidate(candidate.Source, baseUri, null, candidate.Description);
    }

    private sealed record ContainerCandidate(
        [property: JsonPropertyName("hostPort")] int HostPort,
        [property: JsonPropertyName("source")] string Source,
        [property: JsonPropertyName("description")] string Description
    );
}
