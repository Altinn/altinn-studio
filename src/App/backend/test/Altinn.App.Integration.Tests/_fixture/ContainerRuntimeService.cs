using System.Text.RegularExpressions;
using DotNet.Testcontainers.Builders;

namespace Altinn.App.Integration.Tests;

internal static partial class ContainerRuntimeService
{
    private static string? _cachedHostIp; // process-lifetime cache
    private static readonly SemaphoreSlim _lock = new(1, 1);

    /// <summary>
    /// Returns an IPv4 address that containers can use to reach the host.
    /// </summary>
    public static async Task<string> GetHostIP(CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrEmpty(_cachedHostIp))
            return _cachedHostIp;

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (!string.IsNullOrEmpty(_cachedHostIp))
                return _cachedHostIp;

            // One-shot probe container that prints a single IPv4 and exits.
            // Strategy:
            // 1) Try common internal hostnames (Docker Desktop, Podman, Rancher Desktop).
            // 2) Fallback: parse default gateway from /proc/net/route (works on Linux engines).
            var probeScript = """
                set -e
                try_host() {
                    # use ping -4 to force IPv4; parse 'PING name (A.B.C.D)'
                    ip=$(ping -4 -c1 -W1 "$1" 2>/dev/null | sed -n 's/^PING [^(]*(\([0-9.]*\)).*/\1/p')
                    if [ -n "$ip" ]; then echo "$ip"; return 0; fi
                    return 1
                }
                for n in host.docker.internal host.containers.internal host.rancher-desktop.internal host.lima.internal; do
                    try_host "$n" && exit 0
                done
                # default route (Gateway hex in column 3 of /proc/net/route on the 0.0.0.0 row)
                g=$(awk '$2=="00000000" {print $3}' /proc/net/route | head -n1)
                if [ -n "$g" ]; then
                    printf "%d.%d.%d.%d\n" 0x${g:6:2} 0x${g:4:2} 0x${g:2:2} 0x${g:0:2}
                fi
                """.ReplaceLineEndings("\n");

            await using var container = new ContainerBuilder()
                .WithImage("busybox:1.37")
                .WithName("applib-runtimeservice")
                .WithCommand("sh", "-lc", probeScript)
                .Build();

            await container.StartAsync(cancellationToken);
            await container.GetExitCodeAsync(cancellationToken);

            // Get the logs from the container
            var (stdout, stderr) = await container.GetLogsAsync(timestampsEnabled: false, ct: cancellationToken);

            var ip = ExtractFirstIPv4(stdout);
            if (ip is null)
                throw new InvalidOperationException(
                    $"Unable to determine host IPv4 from probe. stdout: {stdout}, stderr: {stderr}"
                );

            _cachedHostIp = ip;
            return ip;
        }
        finally
        {
            _lock.Release();
        }
    }

    [GeneratedRegex(@"(\b25[0-5]|\b2[0-4][0-9]|\b[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}")]
    private static partial Regex IPv4Regex();

    private static string? ExtractFirstIPv4(string text)
    {
        var m = IPv4Regex().Match(text);
        return m.Success ? m.Value : null;
    }
}
