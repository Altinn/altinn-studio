using System.Text;
using LocalTest.Configuration;
using LocalTest.Services.Authorization.Implementation;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace LocalTest.Tests.Authorization;

/// <summary>
/// Localtest writes every authorization decision to its own file, which developers browse in the Storage
/// Explorer. Apps make thousands of decisions a day, so only the newest are kept.
/// </summary>
public class AuthorizationAuditLogTests : IDisposable
{
    private readonly string _root;
    private readonly FixedTimeProvider _time = new(new DateTimeOffset(2026, 10, 21, 10, 36, 12, 171, TimeSpan.Zero));

    public AuthorizationAuditLogTests()
    {
        _root = Path.Combine(Path.GetTempPath(), $"localtest-audit-{Guid.NewGuid()}") + Path.DirectorySeparatorChar;
        Directory.CreateDirectory(_root);
    }

    public void Dispose()
    {
        GC.SuppressFinalize(this);
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    private string AuditFolder => Path.Combine(_root, new LocalPlatformSettings().AuthorizationAuditFolder);

    private AuthorizationAuditLog CreateLog(int maxFiles = 1000) =>
        new(
            Options.Create(
                new LocalPlatformSettings { LocalTestingStorageBasePath = _root, AuthorizationAuditMaxFiles = maxFiles }
            ),
            _time,
            NullLogger<AuthorizationAuditLog>.Instance
        );

    private string[] EntryNames() =>
        Directory.Exists(AuditFolder)
            ? Directory.GetFiles(AuditFolder).Select(f => Path.GetFileName(f)).Order(StringComparer.Ordinal).ToArray()
            : [];

    private void WriteExistingEntries(int count)
    {
        Directory.CreateDirectory(AuditFolder);
        for (var i = 0; i < count; i++)
        {
            File.WriteAllText(Path.Combine(AuditFolder, $"2026-10-15T08:00:{i:00}.000_read.json"), "{}");
        }
    }

    [Fact]
    public async Task Write_NamesTheEntryByTimestampAndActions()
    {
        await CreateLog().Write(["read", "write"], Encoding.UTF8.GetBytes("{}"));

        Assert.Equal(["2026-10-21T10:36:12.171_read+write.json"], EntryNames());
    }

    [Fact]
    public async Task Write_SameActionsInTheSameMillisecond_KeepsBothEntries()
    {
        var log = CreateLog();

        await log.Write(["read"], Encoding.UTF8.GetBytes("""{"entry":"first, and longer"}"""));
        await log.Write(["read"], Encoding.UTF8.GetBytes("""{"entry":"second"}"""));

        Assert.Equal(["2026-10-21T10:36:12.171_read.json", "2026-10-21T10:36:12.171_read_2.json"], EntryNames());
        // The second entry neither overwrites the first nor leaves the end of it in its own file.
        Assert.Equal(
            """{"entry":"first, and longer"}""",
            File.ReadAllText(Path.Combine(AuditFolder, "2026-10-21T10:36:12.171_read.json"))
        );
        Assert.Equal(
            """{"entry":"second"}""",
            File.ReadAllText(Path.Combine(AuditFolder, "2026-10-21T10:36:12.171_read_2.json"))
        );
    }

    [Fact]
    public async Task Write_ConcurrentDecisionsInTheSameMillisecond_KeepsEveryEntry()
    {
        var log = CreateLog();
        const int decisions = 50;

        await Task.WhenAll(
            Enumerable
                .Range(0, decisions)
                .Select(i => Task.Run(() => log.Write(["read"], Encoding.UTF8.GetBytes($$"""{"entry":{{i}}}"""))))
        );
        await log.PruneTask;

        var contents = Directory.GetFiles(AuditFolder).Select(File.ReadAllText).Order().ToArray();
        Assert.Equal(
            Enumerable.Range(0, decisions).Select(i => $$"""{"entry":{{i}}}""").Order().ToArray(),
            contents
        );
    }

    [Fact]
    public async Task Write_FirstDecisionAfterStartup_PrunesWhatEarlierRunsLeft()
    {
        WriteExistingEntries(30);
        var log = CreateLog(maxFiles: 10);

        await log.Write(["read"], Encoding.UTF8.GetBytes("{}"));
        await log.PruneTask;

        Assert.Equal(
            [
                .. Enumerable.Range(21, 9).Select(i => $"2026-10-15T08:00:{i}.000_read.json"),
                "2026-10-21T10:36:12.171_read.json",
            ],
            EntryNames()
        );
    }

    [Fact]
    public async Task Write_ManyDecisions_StaysNearTheLimit()
    {
        const int maxFiles = 20;
        var log = CreateLog(maxFiles);

        for (var i = 0; i < 100; i++)
        {
            _time.Advance(TimeSpan.FromMilliseconds(1));
            await log.Write(["read"], Encoding.UTF8.GetBytes("{}"));
            await log.PruneTask;
        }

        var names = EntryNames();
        Assert.InRange(names.Length, maxFiles, maxFiles + maxFiles / 10);
        Assert.Equal("2026-10-21T10:36:12.271_read.json", names[^1]);
    }

    [Fact]
    public async Task Write_WithLimitZero_WritesNothing()
    {
        await CreateLog(maxFiles: 0).Write(["read"], Encoding.UTF8.GetBytes("{}"));

        Assert.Empty(EntryNames());
    }

    [Fact]
    public void Prune_LeavesFilesItDidNotWrite()
    {
        WriteExistingEntries(5);
        File.WriteAllText(Path.Combine(AuditFolder, "notes.json"), "{}");
        Directory.CreateDirectory(Path.Combine(AuditFolder, "resources"));
        File.WriteAllText(Path.Combine(AuditFolder, "resources", "2026-10-01T00:00:00.000_read.json"), "{}");

        AuthorizationAuditLog.Prune(AuditFolder, maxFiles: 2);

        Assert.Equal(
            ["2026-10-15T08:00:03.000_read.json", "2026-10-15T08:00:04.000_read.json", "notes.json"],
            EntryNames()
        );
        Assert.True(File.Exists(Path.Combine(AuditFolder, "resources", "2026-10-01T00:00:00.000_read.json")));
    }

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset _now = now;

        public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;

        public override DateTimeOffset GetUtcNow() => _now;

        public void Advance(TimeSpan by) => _now += by;
    }
}
