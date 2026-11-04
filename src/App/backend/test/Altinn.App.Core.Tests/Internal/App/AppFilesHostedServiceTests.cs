using System.Text;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.App;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Time.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Internal.App;

public sealed class AppFilesHostedServiceTests : IDisposable
{
    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("AppFilesHostedService-");
    private readonly FakeTimeProvider _timeProvider = new();
    private DateTime _lastWriteTimeUtc = DateTime.UtcNow;

    public void Dispose() => _appDir.Delete(recursive: true);

    private void WriteFile(string relativePath, string content)
    {
        string path = Path.Join(_appDir.FullName, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        // Some file systems only keep whole seconds, so move the clock on to make every write visible in the stamp
        _lastWriteTimeUtc = _lastWriteTimeUtc.AddMinutes(1);
        File.SetLastWriteTimeUtc(path, _lastWriteTimeUtc);
    }

    private (AppFilesAccessor Accessor, AppFilesHostedService Service) Start(
        string environment = "Development",
        ILogger<AppFilesHostedService>? logger = null
    )
    {
        var env = new Mock<IHostEnvironment>();
        env.SetupGet(e => e.EnvironmentName).Returns(environment);
        env.SetupGet(e => e.ContentRootPath).Returns(_appDir.FullName);
        var accessor = new AppFilesAccessor(AppFilesLoader.Load(_appDir.FullName));
        return (
            accessor,
            new AppFilesHostedService(
                accessor,
                env.Object,
                logger ?? NullLogger<AppFilesHostedService>.Instance,
                _timeProvider
            )
        );
    }

    [Fact]
    public void A_poll_replaces_the_snapshot_only_when_the_files_changed()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        WriteFile("ui/footer.json", """{ "footer": [] }""");
        var (accessor, service) = Start();
        var initial = accessor.Current;

        Assert.Equal(AppFilesHostedService.ReloadOutcome.Unchanged, service.Poll());
        Assert.Same(initial, accessor.Current);

        WriteFile("ui/footer.json", """{ "footer": [1] }""");
        WriteFile("options/land.json", "[]");
        Assert.Equal(AppFilesHostedService.ReloadOutcome.Reloaded, service.Poll());

        Assert.Equal("""{ "footer": [1] }""", Footer(accessor));
        Assert.Equal(["land"], accessor.Current.GetOptionIds());
        // The previous snapshot is untouched, so a request that is using it sees consistent files
        Assert.Equal("""{ "footer": [] }""", Encoding.UTF8.GetString(initial.Ui.Footer!.Value.Span));
    }

    [Fact]
    public void A_broken_change_keeps_the_previous_snapshot_and_is_not_retried_until_the_files_change_again()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        WriteFile("ui/footer.json", """{ "footer": [] }""");
        var (accessor, service) = Start();

        WriteFile("ui/footer.json", """{ "footer": [ }""");
        Assert.Equal(AppFilesHostedService.ReloadOutcome.Failed, service.Poll());
        Assert.Equal("""{ "footer": [] }""", Footer(accessor));

        // The same broken state is not retried, so the log is not spammed on every poll
        Assert.Equal(AppFilesHostedService.ReloadOutcome.Unchanged, service.Poll());

        WriteFile("ui/footer.json", """{ "footer": [2] }""");
        Assert.Equal(AppFilesHostedService.ReloadOutcome.Reloaded, service.Poll());
        Assert.Equal("""{ "footer": [2] }""", Footer(accessor));
    }

    [Fact]
    public void Deleting_the_application_metadata_file_keeps_the_previous_snapshot()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        var (accessor, service) = Start();

        File.Delete(Path.Join(_appDir.FullName, "config/applicationmetadata.json"));

        Assert.Equal(AppFilesHostedService.ReloadOutcome.Failed, service.Poll());
        Assert.Equal("""{ "id": "ttd/app" }""", Encoding.UTF8.GetString(accessor.Current.ApplicationMetadata.Span));
    }

    [Fact]
    public async Task Singleton_services_see_the_reloaded_files()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app", "title": { "nb": "Før" } }""");
        WriteFile("options/land.json", """[{ "value": "NO", "label": "Norge" }]""");
        var (accessor, service) = Start();
        var frontendFeatures = new Mock<IFrontendFeatures>();
        frontendFeatures.Setup(f => f.GetDictionary()).Returns(new Dictionary<string, bool>());
        var appMetadata = new AppMetadata(accessor, frontendFeatures.Object);
        var options = new AppOptionsFileHandler(accessor);
        Assert.Equal("Før", (appMetadata.ApplicationMetadata).Title["nb"]);
        Assert.Equal("Norge", Assert.Single((await options.ReadOptionsFromFile("land"))!).Label);

        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app", "title": { "nb": "Etter" } }""");
        WriteFile("options/land.json", """[{ "value": "SE", "label": "Sverige" }]""");
        Assert.Equal(AppFilesHostedService.ReloadOutcome.Reloaded, service.Poll());

        // AppMetadata caches the parsed file, but only for as long as the snapshot it was parsed from is current
        Assert.Equal("Etter", (appMetadata.ApplicationMetadata).Title["nb"]);
        Assert.Equal("Sverige", Assert.Single((await options.ReadOptionsFromFile("land"))!).Label);
    }

    [Fact]
    public async Task The_background_service_polls_on_the_interval()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        WriteFile("ui/footer.json", """{ "footer": [] }""");
        var (accessor, service) = Start();
        await service.StartAsync(CancellationToken.None);

        Assert.Equal(AppFilesHostedService.ReloadOutcome.Unchanged, await NextOutcome(service));

        WriteFile("ui/footer.json", """{ "footer": [1] }""");
        Assert.Equal(AppFilesHostedService.ReloadOutcome.Reloaded, await NextOutcomeAfterChange(service));
        Assert.Equal("""{ "footer": [1] }""", Footer(accessor));

        await service.StopAsync(CancellationToken.None);
    }

    [Fact]
    public void A_reload_replaces_the_parsed_files_and_the_current_snapshot_together()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        WriteFile("ui/footer.json", """{ "footer": [] }""");
        var (accessor, service) = Start();
        var initial = accessor.Parsed;

        WriteFile("ui/footer.json", """{ "footer": [1] }""");
        Assert.Equal(AppFilesHostedService.ReloadOutcome.Reloaded, service.Poll());

        Assert.NotSame(initial, accessor.Parsed);
        Assert.Same(accessor.Current, accessor.Parsed.Files);
        Assert.Equal("""{ "footer": [1] }""", Footer(accessor));
    }

    [Fact]
    public async Task Outside_development_the_service_starts_and_never_polls()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        WriteFile("ui/footer.json", """{ "footer": [] }""");
        var (accessor, service) = Start("Production");

        await service.StartAsync(CancellationToken.None);
        WriteFile("ui/footer.json", """{ "footer": [1] }""");
        _timeProvider.Advance(AppFilesHostedService.PollInterval * 5);

        // The poll loop returns at once, which completes the outcomes without a single poll
        await service.Outcomes.Completion.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.False(service.Outcomes.TryRead(out _));
        Assert.Equal("""{ "footer": [] }""", Footer(accessor));

        await service.StopAsync(CancellationToken.None);
    }

    [Fact]
    public async Task Starting_logs_nothing_for_a_snapshot_without_diagnostics()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        var logger = new FakeLogger<AppFilesHostedService>();
        var (_, service) = Start("Production", logger);

        await service.StartAsync(CancellationToken.None);
        await service.StopAsync(CancellationToken.None);

        Assert.Empty(logger.Collector.GetSnapshot());
    }

    [Fact]
    public void LogDiagnostics_logs_each_diagnostic_at_its_level()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        // No parser reports diagnostics yet, so the parsed files are built with the test constructor
        var parsed = new ParsedAppFiles(
            AppFilesLoader.Load(_appDir.FullName),
            [
                new AppFileDiagnostic(LogLevel.Information, "config/texts/resource.nb.json", "a"),
                new AppFileDiagnostic(LogLevel.Warning, "ui/footer.json", "b"),
            ]
        );
        var logger = new FakeLogger<AppFilesHostedService>();

        AppFilesHostedService.LogDiagnostics(logger, parsed);

        var records = logger.Collector.GetSnapshot();
        Assert.Equal(2, records.Count);
        Assert.Equal([LogLevel.Information, LogLevel.Warning], records.Select(r => r.Level));
        Assert.Equal(["config/texts/resource.nb.json: a", "ui/footer.json: b"], records.Select(r => r.Message));
        var state = records[1].StructuredState ?? throw new InvalidOperationException("No structured state");
        Assert.Contains(new KeyValuePair<string, string?>("Path", "ui/footer.json"), state);
        Assert.Contains(new KeyValuePair<string, string?>("Message", "b"), state);
    }

    private static string Footer(AppFilesAccessor accessor) =>
        Encoding.UTF8.GetString(accessor.Current.Ui.Footer!.Value.Span);

    /// <summary>
    /// Advances the fake clock until the service has polled once. The poll loop starts asynchronously after
    /// StartAsync, so a single advance could happen before the timer exists.
    /// </summary>
    private async Task<AppFilesHostedService.ReloadOutcome> NextOutcome(AppFilesHostedService service)
    {
        var read = service.Outcomes.ReadAsync(CancellationToken.None).AsTask();
        for (int i = 0; i < 200 && !read.IsCompleted; i++)
        {
            _timeProvider.Advance(AppFilesHostedService.PollInterval);
            await Task.WhenAny(read, Task.Delay(25));
        }

        return await read.WaitAsync(TimeSpan.FromSeconds(5));
    }

    /// <summary>
    /// Skips polls that ran before the change on disk was made.
    /// </summary>
    private async Task<AppFilesHostedService.ReloadOutcome> NextOutcomeAfterChange(AppFilesHostedService service)
    {
        for (int i = 0; i < 20; i++)
        {
            var outcome = await NextOutcome(service);
            if (outcome != AppFilesHostedService.ReloadOutcome.Unchanged)
            {
                return outcome;
            }
        }

        return AppFilesHostedService.ReloadOutcome.Unchanged;
    }
}
