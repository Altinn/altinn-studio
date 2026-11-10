using Altinn.Studio.StudioctlServer.Platform;
using Microsoft.Extensions.Logging;

namespace Studioctl.Tests.Platform;

public sealed class FileLoggerProviderTests : IDisposable
{
    private readonly string _directory = Path.Combine(
        Path.GetTempPath(),
        "studioctl-tests-" + Guid.NewGuid().ToString("N")
    );

    public FileLoggerProviderTests() => Directory.CreateDirectory(_directory);

    public void Dispose() => Directory.Delete(_directory, recursive: true);

    [Fact]
    public void Startup_DeletesOnlyLogsOlderThanRetention()
    {
        string[] expired = ["2026-09-21-1.log", "2026-09-22-1.log"];
        string[] kept =
        [
            "2026-09-23-1.log",
            "2026-10-22-2.log",
            "2026-01-01.log",
            "2026-01-01-0.log",
            "2026-01-01-x.log",
            "2026-01-01-1.txt",
            "server.log",
        ];
        foreach (var name in expired.Concat(kept))
            File.WriteAllText(Path.Combine(_directory, name), "old");

        var time = new FakeTimeProvider(new DateTimeOffset(2026, 10, 23, 12, 0, 0, TimeSpan.Zero));
        new FileLoggerProvider(_directory, time).Dispose();

        Assert.Equal(
            kept.Append("2026-10-23-3.log").Order(StringComparer.Ordinal),
            Directory.GetFiles(_directory).Select(Path.GetFileName).Order(StringComparer.Ordinal),
            StringComparer.Ordinal
        );
    }

    [Fact]
    public async Task Rotation_DeletesLogsThatExpired()
    {
        var expiringPath = Path.Combine(_directory, "2026-09-23-1.log");
        await File.WriteAllTextAsync(expiringPath, "old", TestContext.Current.CancellationToken);
        var time = new FakeTimeProvider(new DateTimeOffset(2026, 10, 23, 23, 59, 0, TimeSpan.Zero));

        using (var provider = new FileLoggerProvider(_directory, time))
        {
            var logger = provider.CreateLogger("test");
            logger.LogInformation("before rotation");
            // The writer handles entries after startup pruning, so a written entry means startup pruning is done.
            await WaitForContent(Path.Combine(_directory, "2026-10-23-2.log"), "before rotation");
            Assert.True(File.Exists(expiringPath));

            time.UtcNow = new DateTimeOffset(2026, 10, 24, 0, 1, 0, TimeSpan.Zero);
            logger.LogInformation("after rotation");
        }

        Assert.False(File.Exists(expiringPath));
        Assert.True(File.Exists(Path.Combine(_directory, "2026-10-23-2.log")));
        Assert.Contains(
            "after rotation",
            ReadShared(Path.Combine(_directory, "2026-10-24-2.log")),
            StringComparison.Ordinal
        );
    }

    private static async Task WaitForContent(string path, string text)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(10));
        while (!ReadShared(path).Contains(text, StringComparison.Ordinal))
            await Task.Delay(10, timeout.Token);
    }

    private static string ReadShared(string path)
    {
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private sealed class FakeTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public DateTimeOffset UtcNow { get; set; } = utcNow;

        public override DateTimeOffset GetUtcNow() => UtcNow;
    }
}
