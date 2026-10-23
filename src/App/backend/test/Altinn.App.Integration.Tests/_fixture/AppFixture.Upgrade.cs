using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Integration.Tests;

public sealed partial class AppFixture
{
    // localtest caches each app's metadata and XACML policy with a 5 second sliding expiration (LocalAppHttp in
    // src/Runtime/localtest). Waiting longer than that after stopping the old version means localtest reads the
    // new version's policy and metadata instead of the old ones.
    private static readonly TimeSpan _localtestAppCacheExpiry = TimeSpan.FromSeconds(6);

    /// <summary>
    /// Replaces the running app with another version of it, the way a deploy does: stops the app process,
    /// regenerates the app folder from <paramref name="app"/> under the same app id, and starts the new version.
    /// Localtest and the workflow engine keep their state, so instances created before the call are still there.
    /// The fixture keeps its name, scenario and snapshot numbering, so <paramref name="app"/> must have the
    /// fixture's scenario folder unless the scenario is "default".
    /// </summary>
    internal async Task UpgradeTo(string app, CancellationToken cancellationToken = default)
    {
        Assert.False(_isClassFixture, "A class fixture is shared between tests, so it can't be upgraded.");

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromMinutes(10));
        cancellationToken = cts.Token;

        var timer = Stopwatch.StartNew();
        _logger.LogInformation("Upgrading the app to {App}..", app);

        await _appProcess.DisposeAsync();
        _previousAppProcesses.Add(_appProcess);
        var stoppedTimer = Stopwatch.StartNew();

        _directAppClient?.Dispose();
        _directAppClient = null;

        // Files the new version no longer has (a v8 app's layout-sets.json, for example) must not survive
        // into it, so the old folder has to be gone before the new version is generated in its place.
        await DeleteDirectoryBestEffort(_logger, _generatedAppDirectory);
        Assert.False(
            Directory.Exists(_generatedAppDirectory),
            $"Could not delete the previous app version in {_generatedAppDirectory}"
        );

        await GenerateAppDirectory(app, _scenario, _appId, _generatedAppDirectory, _logger, cancellationToken);
        await WriteFixtureConfiguration(
            _fixtureConfigurationPath,
            _app,
            _scenario,
            _currentFixtureInstance,
            cancellationToken
        );
        _appProcess = await StudioctlAppProcess.Start(
            _generatedAppDirectory,
            _fixtureConfigurationPath,
            _nugetPackagesDirectory,
            $"/{_appId}/altinn-app-frontend",
            _environmentVariables,
            _logger,
            cancellationToken
        );
        // The new process writes a new log file
        _appLogLineOffset = 0;

        await EnsureAppStillRunning(_appProcess, cancellationToken);
        await WaitForLocaltestRoutingReady(_appId, _logger, cancellationToken);

        var remainingCacheExpiry = _localtestAppCacheExpiry - stoppedTimer.Elapsed;
        if (remainingCacheExpiry > TimeSpan.Zero)
            await Task.Delay(remainingCacheExpiry, cancellationToken);

        _logger.LogInformation(
            "Upgraded the app to {App} in {ElapsedSeconds}s",
            app,
            timer.Elapsed.TotalSeconds.ToString("0.00")
        );
    }
}
