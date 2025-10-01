using System;

#nullable enable

namespace TestApp.Shared;

/// <summary>
/// All the log messages from this class will be caught by the integration test harness
/// and included in integration test snapshots and logs.
/// </summary>
public static class SnapshotLogger
{
    private static string GetCurrentPrefix()
    {
        var config = FixtureConfigurationService.Instance.Config;
        if (config is null)
            throw new InvalidOperationException("Fixture configuration not initialized");
        var fixtureInstance = config.FixtureInstance.ToString("00");
        var name = config.AppName;
        var scenario = config.AppScenario;

        return $"[{fixtureInstance}/{name}/{scenario}]";
    }

    public static void LogInfo(string message) => Console.WriteLine($"{GetCurrentPrefix()} [INFO] {message}");

    public static void LogWarning(string message) => Console.WriteLine($"{GetCurrentPrefix()} [WARN] {message}");

    public static void LogError(string message) => Console.WriteLine($"{GetCurrentPrefix()} [ERROR] {message}");

    public static void LogInitInfo(string message) => Console.WriteLine($"{GetCurrentPrefix()} [INIT INFO] {message}");

    public static void LogInitWarning(string message) =>
        Console.WriteLine($"{GetCurrentPrefix()} [INIT WARN] {message}");

    public static void LogInitError(string message) =>
        Console.WriteLine($"{GetCurrentPrefix()} [INIT ERROR] {message}");
}
