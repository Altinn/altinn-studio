namespace Altinn.Studio.AppManager.Platform;

internal static class RuntimeFiles
{
    private const string UnixSocketPathKey = "APP_MANAGER_UNIX_SOCKET_PATH";

    public static void PrepareIpcArtifacts(IConfiguration configuration)
    {
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

    public static void RegisterCleanup(IConfiguration configuration, IHostApplicationLifetime lifetime)
    {
        lifetime.ApplicationStopping.Register(() =>
        {
            TryDelete(configuration[UnixSocketPathKey]);
        });
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
