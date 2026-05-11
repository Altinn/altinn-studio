using Microsoft.AspNetCore.Server.Kestrel.Core;

namespace Altinn.Studio.StudioctlServer.Platform;

internal static class IpcListener
{
    private const string UnixSocketPathKey = "STUDIOCTL_SERVER_UNIX_SOCKET_PATH";

    public static void Configure(IConfiguration configuration, KestrelServerOptions options)
    {
        RuntimeFiles.PrepareIpcArtifacts(configuration);
        ConfigureUnixSocket(configuration, options);
    }

    private static void ConfigureUnixSocket(IConfiguration configuration, KestrelServerOptions options)
    {
        var unixSocketPath = configuration[UnixSocketPathKey];
        if (string.IsNullOrWhiteSpace(unixSocketPath))
        {
            throw new InvalidOperationException(
                $"Missing required configuration value {UnixSocketPathKey} for studioctl-server Unix socket listener."
            );
        }

        options.ListenUnixSocket(unixSocketPath);
    }
}
