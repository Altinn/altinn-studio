using System.Text;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.App;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Internal.App;

public sealed class AppFilesPollerTests : IDisposable
{
    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("AppFilesPoller-");
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

    private async Task<(AppFilesAccessor Accessor, AppFilesPoller Poller)> Start()
    {
        var accessor = new AppFilesAccessor(await AppFilesLoader.Load(_appDir.FullName, default));
        return (
            accessor,
            new AppFilesPoller(accessor, _appDir.FullName, NullLogger<AppFilesPoller>.Instance, _timeProvider)
        );
    }

    [Fact]
    public async Task A_poll_replaces_the_snapshot_only_when_the_files_changed()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        WriteFile("ui/footer.json", """{ "footer": [] }""");
        var (accessor, poller) = await Start();
        var initial = accessor.Current;

        Assert.Equal(AppFilesPoller.ReloadOutcome.Unchanged, await poller.Poll(default));
        Assert.Same(initial, accessor.Current);

        WriteFile("ui/footer.json", """{ "footer": [1] }""");
        WriteFile("options/land.json", "[]");
        Assert.Equal(AppFilesPoller.ReloadOutcome.Reloaded, await poller.Poll(default));

        Assert.Equal("""{ "footer": [1] }""", Footer(accessor));
        Assert.Equal(["land"], accessor.Current.GetOptionIds());
        // The previous snapshot is untouched, so a request that is using it sees consistent files
        Assert.Equal("""{ "footer": [] }""", Encoding.UTF8.GetString(initial.Ui.Footer!.Value.Span));
    }

    [Fact]
    public async Task A_broken_change_keeps_the_previous_snapshot_and_is_not_retried_until_the_files_change_again()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        WriteFile("ui/footer.json", """{ "footer": [] }""");
        var (accessor, poller) = await Start();

        WriteFile("ui/footer.json", """{ "footer": [ }""");
        Assert.Equal(AppFilesPoller.ReloadOutcome.Failed, await poller.Poll(default));
        Assert.Equal("""{ "footer": [] }""", Footer(accessor));

        // The same broken state is not retried, so the log is not spammed on every poll
        Assert.Equal(AppFilesPoller.ReloadOutcome.Unchanged, await poller.Poll(default));

        WriteFile("ui/footer.json", """{ "footer": [2] }""");
        Assert.Equal(AppFilesPoller.ReloadOutcome.Reloaded, await poller.Poll(default));
        Assert.Equal("""{ "footer": [2] }""", Footer(accessor));
    }

    [Fact]
    public async Task Deleting_the_application_metadata_file_keeps_the_previous_snapshot()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        var (accessor, poller) = await Start();

        File.Delete(Path.Join(_appDir.FullName, "config/applicationmetadata.json"));

        Assert.Equal(AppFilesPoller.ReloadOutcome.Failed, await poller.Poll(default));
        Assert.Equal("""{ "id": "ttd/app" }""", Encoding.UTF8.GetString(accessor.Current.ApplicationMetadata.Span));
    }

    [Fact]
    public async Task Singleton_services_see_the_reloaded_files()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app", "title": { "nb": "Før" } }""");
        WriteFile("options/land.json", """[{ "value": "NO", "label": "Norge" }]""");
        var (accessor, poller) = await Start();
        var frontendFeatures = new Mock<IFrontendFeatures>();
        frontendFeatures.Setup(f => f.GetDictionary()).Returns(new Dictionary<string, bool>());
        var appMetadata = new AppMetadata(accessor, frontendFeatures.Object);
        var options = new AppOptionsFileHandler(accessor);
        Assert.Equal("Før", (appMetadata.ApplicationMetadata).Title["nb"]);
        Assert.Equal("Norge", Assert.Single((await options.ReadOptionsFromFileAsync("land"))!).Label);

        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app", "title": { "nb": "Etter" } }""");
        WriteFile("options/land.json", """[{ "value": "SE", "label": "Sverige" }]""");
        Assert.Equal(AppFilesPoller.ReloadOutcome.Reloaded, await poller.Poll(default));

        // AppMetadata caches the parsed file, but only for as long as the snapshot it was parsed from is current
        Assert.Equal("Etter", (appMetadata.ApplicationMetadata).Title["nb"]);
        Assert.Equal("Sverige", Assert.Single((await options.ReadOptionsFromFileAsync("land"))!).Label);
    }

    [Fact]
    public async Task The_background_service_polls_on_the_interval()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        WriteFile("ui/footer.json", """{ "footer": [] }""");
        var (accessor, poller) = await Start();
        await poller.StartAsync(CancellationToken.None);

        Assert.Equal(AppFilesPoller.ReloadOutcome.Unchanged, await NextOutcome(poller));

        WriteFile("ui/footer.json", """{ "footer": [1] }""");
        Assert.Equal(AppFilesPoller.ReloadOutcome.Reloaded, await NextOutcomeAfterChange(poller));
        Assert.Equal("""{ "footer": [1] }""", Footer(accessor));

        await poller.StopAsync(CancellationToken.None);
    }

    private static string Footer(AppFilesAccessor accessor) =>
        Encoding.UTF8.GetString(accessor.Current.Ui.Footer!.Value.Span);

    /// <summary>
    /// Advances the fake clock until the poller has polled once. The poll loop starts asynchronously after
    /// StartAsync, so a single advance could happen before the timer exists.
    /// </summary>
    private async Task<AppFilesPoller.ReloadOutcome> NextOutcome(AppFilesPoller poller)
    {
        var read = poller.Outcomes.ReadAsync(CancellationToken.None).AsTask();
        for (int i = 0; i < 200 && !read.IsCompleted; i++)
        {
            _timeProvider.Advance(AppFilesPoller.PollInterval);
            await Task.WhenAny(read, Task.Delay(25));
        }

        return await read.WaitAsync(TimeSpan.FromSeconds(5));
    }

    /// <summary>
    /// Skips polls that ran before the change on disk was made.
    /// </summary>
    private async Task<AppFilesPoller.ReloadOutcome> NextOutcomeAfterChange(AppFilesPoller poller)
    {
        for (int i = 0; i < 20; i++)
        {
            var outcome = await NextOutcome(poller);
            if (outcome != AppFilesPoller.ReloadOutcome.Unchanged)
            {
                return outcome;
            }
        }

        return AppFilesPoller.ReloadOutcome.Unchanged;
    }
}
