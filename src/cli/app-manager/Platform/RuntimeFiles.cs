namespace Altinn.Studio.AppManager.Platform;

internal static class RuntimeFiles
{
    private const string UnixSocketPathKey = "APP_MANAGER_UNIX_SOCKET_PATH";
    private const string PidPathKey = "APP_MANAGER_PID_PATH";

    public static void Initialize(IConfiguration configuration, IHostApplicationLifetime lifetime)
    {
        var pidPath = configuration[PidPathKey];
        if (string.IsNullOrWhiteSpace(pidPath))
        {
            throw new InvalidOperationException($"Missing required configuration value {PidPathKey} for app-manager.");
        }

        EnsureParentDirectory(pidPath, PidPathKey);
        File.WriteAllText(pidPath, $"{Environment.ProcessId}\n");

        lifetime.ApplicationStopping.Register(() =>
        {
            TryDelete(pidPath);

            if (!OperatingSystem.IsWindows())
            {
                TryDelete(configuration[UnixSocketPathKey]);
            }
        });
    }

    public static void PrepareIpcArtifacts(IConfiguration configuration)
    {
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        var unixSocketPath = configuration[UnixSocketPathKey];
        if (string.IsNullOrWhiteSpace(unixSocketPath))
        {
            throw new InvalidOperationException(
                $"Missing required configuration value {UnixSocketPathKey} for app-manager Unix socket listener."
            );
        }

        EnsureParentDirectory(unixSocketPath, UnixSocketPathKey);
        TryDelete(unixSocketPath);
    }

    private static void EnsureParentDirectory(string path, string configKey)
    {
        var parent = Path.GetDirectoryName(path);
        if (string.IsNullOrWhiteSpace(parent))
        {
            throw new InvalidOperationException(
                $"Configuration value {configKey} must include a parent directory: {path}"
            );
        }

        Directory.CreateDirectory(parent);
    }

    private static void TryDelete(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return;
        }

        try
        {
            File.Delete(path);
        }
        catch
        {
            // Best effort cleanup only. The control-plane client reports runtime issues separately.
        }
    }
}
