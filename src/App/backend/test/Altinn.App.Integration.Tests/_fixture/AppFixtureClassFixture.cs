using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests;

public sealed record AppFixtureScope(AppFixture Fixture) : IAsyncDisposable
{
    public ValueTask DisposeAsync()
    {
        if (Fixture.TestErrored)
        {
            // TestErrored is set to true for test/snapshot failures.
            // When this happens we might not reach the stage of the test where
            // we snapshot app logs. So we have additional code here
            // to output container logs at the end so that test failures in CI for example
            // is easier to debug.
            Fixture.LogContainerLogs();
        }
        return default;
    }
}

/// <summary>
/// xUnit class fixture wrapper for AppFixture to enable reuse across test methods in a class.
/// This provides significant performance benefits by reusing the expensive Docker containers
/// while maintaining proper test isolation through state reset.
/// </summary>
public sealed class AppFixtureClassFixture : IAsyncLifetime
{
    private string? _app;
    private string? _scenario;
    private AppFixture? _appFixture;

    /// <summary>
    /// Initialize the expensive AppFixture once per test class
    /// </summary>
    public async Task InitializeAsync()
    {
        // We need to delay AppFixture.Create until we have ITestOutputHelper
        // This will be called from Get method when the first test runs
        await Task.CompletedTask;
    }

    /// <summary>
    /// Get the AppFixture for a test method, creating it if needed and resetting state
    /// </summary>
    public async Task<AppFixtureScope> Get(
        ITestOutputHelper output,
        string app = TestApps.Basic,
        string scenario = "default"
    )
    {
        // Create fixture on first test method call
        if (_appFixture is null)
        {
            _app = app;
            _scenario = scenario;
            _appFixture = await AppFixture.Create(output, _app, _scenario, isClassFixture: true);
        }
        else
        {
            // Ensure app and scenario haven't changed between test methods
            if (_app != app)
                throw new InvalidOperationException(
                    $"Cannot change app from '{_app}' to '{app}' between test methods in the same class"
                );
            if (_scenario != scenario)
                throw new InvalidOperationException(
                    $"Cannot change scenario from '{_scenario}' to '{scenario}' between test methods in the same class"
                );

            // Reset state between tests for proper isolation
            await _appFixture.ResetBetweenTestsAsync(output);
        }

        return new AppFixtureScope(_appFixture);
    }

    /// <summary>
    /// Dispose the AppFixture when the test class is done
    /// </summary>
    public async Task DisposeAsync()
    {
        if (_appFixture is not null)
        {
            await _appFixture.DisposeAsync();
        }
    }
}
