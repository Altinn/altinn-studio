using System.Security.Cryptography;
using System.Text;
using DotNet.Testcontainers.Builders;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests;

[Trait("Category", "Integration")]
public class FixtureTests
{
    private readonly ITestOutputHelper _output;

    public FixtureTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact(Skip = "Takes some time to pack, so let's not run this every time")]
    public async Task Produces_Deterministic_NuGet_Packages()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(2));

        var output1 = Path.Join(Path.GetTempPath(), Path.GetRandomFileName());
        Assert.False(Directory.Exists(output1), $"Output directory already exists: {output1}");
        var output2 = Path.Join(Path.GetTempPath(), Path.GetRandomFileName());
        Assert.False(Directory.Exists(output2), $"Output directory already exists: {output2}");

        await NuGetPackaging.PackLibraries(output1, null, cts.Token);
        await NuGetPackaging.PackLibraries(output2, null, cts.Token);

        var nupkgFiles1 = Directory.GetFiles(output1, "*.nupkg");
        var nupkgFiles2 = Directory.GetFiles(output2, "*.nupkg");
        Assert.Equal(nupkgFiles1.Length, nupkgFiles2.Length);
        Assert.True(nupkgFiles1.Length > 0, "No NuGet packages were created");
        for (int i = 0; i < nupkgFiles1.Length; i++)
        {
            var nupkgFile1 = nupkgFiles1[i];
            var nupkgFile2 = nupkgFiles2[i];
            Assert.Equal(Path.GetFileName(nupkgFile1), Path.GetFileName(nupkgFile2));
            var checksums = await Task.WhenAll(Checksum(nupkgFile1), Checksum(nupkgFile2));
            Assert.Equal(checksums[0], checksums[1]);
        }

        Directory.Delete(output1, true);
        Directory.Delete(output2, true);

        async Task<string> Checksum(string filePath)
        {
            await using var stream = File.OpenRead(filePath);
            using var sha256 = SHA256.Create();
            var hash = await sha256.ComputeHashAsync(stream, cts.Token);
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < hash.Length; i++)
                builder.Append(hash[i].ToString("x2")); // "x2" formats as two lowercase hexadecimal digits
            return builder.ToString();
        }
    }

    [Fact]
    public async Task LogsConsumer()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;
        var logger = new TestOutputLogger(_output, 0, "test", "test", false);

        var logsConsumer = new AppFixture.LogsConsumer(logger, 0, cancellationToken);

        await using var container = new ContainerBuilder()
            .WithImage("busybox:1.37")
            .WithCommand(
                "/bin/sh",
                "-c",
                // We separate stdout and stderr here because
                // the current LogsConsumer gets stdout and stderr as separate
                // streams due to Testcontainers. So we can't really rely on the ordering much
                """
                printf 'stdout line 1\n'
                printf 'stdout line 2\n'
                printf 'stdout line 3\n'
                sleep 1
                printf 'stderr line 1\n' >&2
                printf 'stderr line 2\n' >&2
                printf 'stderr line 3\n' >&2
                exit 0
                """.ReplaceLineEndings("\n")
            )
            .WithOutputConsumer(logsConsumer)
            .Build();

        await container.StartAsync(cancellationToken);
        await container.GetExitCodeAsync(cancellationToken);

        var lines = logsConsumer.GetLines();

        await Verify(string.Join("\n", lines));
    }

    [Fact]
    public async Task DebugNetworking()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        var hostIp = await ContainerRuntimeService.GetHostIP(cancellationToken);

        var pingScript = $"""
            echo "--/etc/hosts---------------------"
            echo ""
            cat /etc/hosts
            echo ""
            echo "---------------------------------"

            echo "--ip routes---------------------"
            echo ""
            ip route show
            echo ""
            echo "---------------------------------"

            echo "--Ping host IP-------------------"
            echo ""
            ping -4 -c1 -W1 {hostIp}
            echo ""
            echo "---------------------------------"

            echo "--Ping host.containers.internal--"
            echo ""
            ping -4 -c1 -W1 host.containers.internal
            echo ""
            echo "---------------------------------"
            """.ReplaceLineEndings("\n");

        await using var container = new ContainerBuilder()
            .WithImage("busybox:1.37")
            .WithName("applib-diagnostics")
            .WithCommand("/bin/sh", "-c", pingScript)
            .WithExtraHost("host.containers.internal", hostIp)
            .Build();

        await container.StartAsync(cancellationToken);
        await container.GetExitCodeAsync(cancellationToken);

        var (stdout, stderr) = await container.GetLogsAsync(timestampsEnabled: false, ct: cancellationToken);

        var output = $"stdout:\n{stdout}\n\nstderr:\n{stderr}";

        await Verify(output).UseDirectory("_snapshots/_local").AutoVerify(includeBuildServer: true);
    }
}
