using System;

namespace BasicApp;

/// <summary>
/// All the log messages from this class will be caught by the integration test harness
/// and included in integration test snapshots and logs.
/// </summary>
internal static class SnapshotLogger
{
    private static readonly string _fixtureInstance =
        Environment.GetEnvironmentVariable("TEST_FIXTURE_INSTANCE")
        ?? throw new InvalidOperationException("TEST_FIXTURE_INSTANCE environment variable is not set.");
    private static readonly string _name =
        Environment.GetEnvironmentVariable("TEST_APP_NAME")
        ?? throw new InvalidOperationException("TEST_APP_NAME environment variable is not set.");
    private static readonly string _scenario =
        Environment.GetEnvironmentVariable("TEST_APP_SCENARIO")
        ?? throw new InvalidOperationException("TEST_APP_SCENARIO environment variable is not set.");
    private static readonly string _prefix = $"[{_fixtureInstance}/{_name}/{_scenario}]";

    public static void LogInfo(string message) => Console.WriteLine($"{_prefix} [INFO] {message}");

    public static void LogWarning(string message) => Console.WriteLine($"{_prefix} [WARN] {message}");

    public static void LogError(string message) => Console.WriteLine($"{_prefix} [ERROR] {message}");
}
