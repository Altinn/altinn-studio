using Microsoft.AspNetCore.Server.Kestrel.Core;

namespace Altinn.Studio.AppManager.Platform;

internal static class IpcListener
{
    private const string UnixSocketPathKey = "APP_MANAGER_UNIX_SOCKET_PATH";
    private const string NamedPipeNameKey = "APP_MANAGER_NAMED_PIPE_NAME";
    private const string DefaultNamedPipeName = "app-manager";

    public static void Configure(IConfiguration configuration, KestrelServerOptions options)
    {
        if (OperatingSystem.IsWindows())
        {
            ConfigureNamedPipe(configuration, options);
            return;
        }

        ConfigureUnixSocket(configuration, options);
    }

    private static void ConfigureNamedPipe(IConfiguration configuration, KestrelServerOptions options)
    {
        var pipeName = configuration[NamedPipeNameKey];
        if (string.IsNullOrWhiteSpace(pipeName))
        {
            pipeName = DefaultNamedPipeName;
        }

        options.ListenNamedPipe(pipeName);
    }

    private static void ConfigureUnixSocket(IConfiguration configuration, KestrelServerOptions options)
    {
        var unixSocketPath = configuration[UnixSocketPathKey];
        if (string.IsNullOrWhiteSpace(unixSocketPath))
        {
            throw new InvalidOperationException(
                $"Missing required configuration value {UnixSocketPathKey} for app-manager Unix socket listener."
            );
        }

        options.ListenUnixSocket(unixSocketPath);
    }
}
