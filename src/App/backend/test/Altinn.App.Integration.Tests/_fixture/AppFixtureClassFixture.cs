using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests;

public sealed class AppFixtureScope(AppFixture fixture, SemaphoreSlim? testLock = null) : IAsyncDisposable
{
    public AppFixture Fixture { get; } = fixture;

    public async ValueTask DisposeAsync()
    {
        try
        {
            if (Fixture.TestErrored)
            {
                // TestErrored is set to true for test/snapshot failures.
                // When this happens we might not reach the stage of the test where we snapshot app logs.
                await Fixture.LogAppLogs();
            }
        }
        finally
        {
            testLock?.Release();
        }
    }
}

/// <summary>
/// xUnit class fixture wrapper for AppFixture to enable reuse across test methods in a class.
/// This provides significant performance benefits by reusing the running app process
/// while maintaining proper test isolation through state reset.
/// </summary>
public sealed class AppFixtureClassFixture : IAsyncLifetime
{
    private readonly SemaphoreSlim _testLock = new(1, 1);
    private string? _app;
    private string? _scenario;
    private AppFixture? _appFixture;

    // AppFixture needs the current test's ITestOutputHelper, so creation is delayed until Get.
    public Task InitializeAsync() => Task.CompletedTask;

    /// <summary>
    /// Get the AppFixture for a test method, creating it if needed and resetting state
    /// </summary>
    public async Task<AppFixtureScope> Get(
        ITestOutputHelper output,
        string app = TestApps.Basic,
        string scenario = "default"
    )
    {
        // The reused app process has mutable fixture configuration, so tests sharing it must be serialized.
        await _testLock.WaitAsync();
        try
        {
            if (_appFixture is null)
            {
                _app = app;
                _scenario = scenario;
                _appFixture = await AppFixture.Create(output, _app, _scenario, isClassFixture: true);
            }
            else
            {
                // Reusing the process only works for the app/scenario it was generated for.
                if (_app != app)
                    throw new InvalidOperationException(
                        $"Cannot change app from '{_app}' to '{app}' between test methods in the same class"
                    );
                if (_scenario != scenario)
                    throw new InvalidOperationException(
                        $"Cannot change scenario from '{_scenario}' to '{scenario}' between test methods in the same class"
                    );

                // The app process stays up; per-test state is reset by reloading fixture configuration.
                await _appFixture.ResetBetweenTestsAsync(output);
            }

            return new AppFixtureScope(_appFixture, _testLock);
        }
        catch
        {
            _testLock.Release();
            throw;
        }
    }

    public async Task DisposeAsync()
    {
        if (_appFixture is not null)
        {
            await _appFixture.DisposeAsync();
        }
    }
}
