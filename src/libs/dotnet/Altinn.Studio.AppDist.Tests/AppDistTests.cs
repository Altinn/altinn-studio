using Xunit;

namespace Altinn.Studio.AppDist.Tests;

public sealed class AppDistTests : IDisposable
{
    private readonly string _tempDir = Directory.CreateTempSubdirectory("appdist-tests-").FullName;

    public void Dispose() => Directory.Delete(_tempDir, recursive: true);

    private static (AppDist Provider, FakeAppDistSource Source, InMemoryAppDistStore Store) Setup()
    {
        var source = new FakeAppDistSource();
        var store = new InMemoryAppDistStore();
        return (new AppDist(source, store), source, store);
    }

    [Fact]
    public async Task GetLayer_FetchesAndReadsContent()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, (AppDist.JsonSchemas.Layout, """{"type":"object"}"""));

        var schemas = await provider.GetLayerAsync("4", AppDistLayer.Schemas);

        Assert.NotNull(schemas);
        Assert.Equal("4", schemas.Version);
        Assert.Equal("""{"type":"object"}""", await schemas.GetFileTextAsync(AppDist.JsonSchemas.Layout));
    }

    [Fact]
    public async Task GetLayer_FetchesOnlyRequestedLayer()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        source.AddFiles("4", AppDistLayer.Bundle, ("altinn-app-frontend.js", "js"));

        await provider.GetLayerAsync("4", AppDistLayer.Schemas);

        Assert.Equal(1, source.FetchRequests);
    }

    [Fact]
    public async Task GetLayer_SecondCallHitsStoreOnlyEvenWhenOffline()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        await provider.GetLayerAsync("4", AppDistLayer.Schemas);

        source.Offline = true;
        var schemas = await provider.GetLayerAsync("4", AppDistLayer.Schemas);

        Assert.NotNull(schemas);
        Assert.Equal("{}", await schemas.GetFileTextAsync("schemas/json/a.json"));
        Assert.Equal(1, source.FetchRequests);
    }

    [Fact]
    public async Task GetLayer_OfflineWithoutStoredCopyReturnsNull()
    {
        var (provider, source, _) = Setup();
        source.Offline = true;

        Assert.Null(await provider.GetLayerAsync("4", AppDistLayer.Schemas));
    }

    [Fact]
    public async Task GetVersion_MaterializesAllLayers()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        source.AddFiles("4", AppDistLayer.Bundle, ("altinn-app-frontend.js", "js"));

        var dist = await provider.GetVersionAsync("4");

        Assert.NotNull(dist);
        Assert.Equal(2, source.FetchRequests);
        string[] expected = ["altinn-app-frontend.js", "schemas/json/a.json"];
        Assert.Equal(expected, await dist.ListFilesAsync());
        Assert.Equal("{}", await dist.GetFileTextAsync("schemas/json/a.json"));
        Assert.Equal("js", await dist.GetFileTextAsync("altinn-app-frontend.js"));
    }

    [Fact]
    public async Task GetVersion_NullWhenAnyLayerUnavailable()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));

        Assert.Null(await provider.GetVersionAsync("4"));
    }

    [Fact]
    public async Task GetVersion_ReusesCachedLayers()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        source.AddFiles("4", AppDistLayer.Bundle, ("altinn-app-frontend.js", "js"));
        await provider.GetLayerAsync("4", AppDistLayer.Schemas);

        var dist = await provider.GetVersionAsync("4");

        Assert.NotNull(dist);
        Assert.Equal(2, source.FetchRequests);
    }

    [Fact]
    public async Task OpenFile_MissingPathThrows()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        var schemas = await provider.GetLayerAsync("4", AppDistLayer.Schemas);
        Assert.NotNull(schemas);

        var ex = await Assert.ThrowsAsync<FileNotFoundException>(() =>
            schemas.OpenFileAsync("schemas/json/missing.json")
        );
        Assert.Contains("missing.json", ex.Message);
    }

    [Fact]
    public async Task GetFiles_StripsPrefixFromKeys()
    {
        var (provider, source, _) = Setup();
        source.AddFiles(
            "4",
            AppDistLayer.Schemas,
            ("schemas/json/layout/a.json", "{}"),
            ("schemas/json/b.json", """{"b":1}""")
        );
        var schemas = await provider.GetLayerAsync("4", AppDistLayer.Schemas);
        Assert.NotNull(schemas);

        var withSlash = await schemas.GetFilesAsync("schemas/json/");
        var withoutSlash = await schemas.GetFilesAsync("schemas/json");

        Assert.Equal(withSlash, withoutSlash);
        Assert.Equal(["b.json", "layout/a.json"], withSlash.Keys.Order(StringComparer.Ordinal));
        Assert.Equal("""{"b":1}""", withSlash["b.json"]);
    }

    [Fact]
    public async Task GetFiles_EmptyPrefixReturnsAllFilesByFullPath()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        var schemas = await provider.GetLayerAsync("4", AppDistLayer.Schemas);
        Assert.NotNull(schemas);

        var files = await schemas.GetFilesAsync();

        Assert.Equal("{}", Assert.Single(files, f => f.Key == "schemas/json/a.json").Value);
    }

    [Fact]
    public async Task GetFiles_NoMatchesReturnsEmpty()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        var schemas = await provider.GetLayerAsync("4", AppDistLayer.Schemas);
        Assert.NotNull(schemas);

        Assert.Empty(await schemas.GetFilesAsync("texts/"));
    }

    [Fact]
    public async Task GetFiles_DoesNotMatchPartialSegment()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"), ("schemas/jsonx/b.json", "{}"));
        var schemas = await provider.GetLayerAsync("4", AppDistLayer.Schemas);
        Assert.NotNull(schemas);

        var files = await schemas.GetFilesAsync("schemas/json");

        Assert.Equal(["a.json"], files.Keys);
    }

    [Fact]
    public async Task ConcurrentGetLayer_CoalescesToSingleFetch()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        source.BlockFetch = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        var tasks = Enumerable.Range(0, 8).Select(_ => provider.GetLayerAsync("4", AppDistLayer.Schemas)).ToArray();
        await source.FetchStarted.Task;
        source.BlockFetch.SetResult();
        var handles = await Task.WhenAll(tasks);

        Assert.All(handles, Assert.NotNull);
        Assert.Equal(1, source.FetchRequests);
    }

    [Fact]
    public async Task ConcurrentDifferentLayers_DoNotBlockEachOther()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        source.AddFiles("4", AppDistLayer.Bundle, ("altinn-app-frontend.js", "js"));
        source.BlockFetch = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        var schemas = provider.GetLayerAsync("4", AppDistLayer.Schemas);
        var bundle = provider.GetLayerAsync("4", AppDistLayer.Bundle);
        for (var i = 0; source.FetchRequests < 2 && i < 500; i++)
            await Task.Delay(10);

        Assert.Equal(2, source.FetchRequests);
        source.BlockFetch.SetResult();
        Assert.NotNull(await schemas);
        Assert.NotNull(await bundle);
    }

    [Fact]
    public async Task UnavailableResultIsNotCached()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        source.Offline = true;

        Assert.Null(await provider.GetLayerAsync("4", AppDistLayer.Schemas));

        source.Offline = false;
        Assert.NotNull(await provider.GetLayerAsync("4", AppDistLayer.Schemas));
        Assert.Equal(1, source.FetchRequests);
    }

    [Fact]
    public async Task WaiterCancellationDoesNotAffectFetcher()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        source.BlockFetch = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        var first = provider.GetLayerAsync("4", AppDistLayer.Schemas);
        await source.FetchStarted.Task;
        using var cts = new CancellationTokenSource();
        var second = provider.GetLayerAsync("4", AppDistLayer.Schemas, cts.Token);
        await cts.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => second);
        source.BlockFetch.SetResult();
        Assert.NotNull(await first);
        Assert.Equal(1, source.FetchRequests);
    }

    [Fact]
    public async Task CopyToDirectory_ExportsAllFiles()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/layout/a.json", "{}"));
        source.AddFiles("4", AppDistLayer.Bundle, ("altinn-app-frontend.js", "js"));
        var dist = await provider.GetVersionAsync("4");
        Assert.NotNull(dist);

        var target = Path.Combine(_tempDir, "www");
        await dist.CopyToDirectoryAsync(target);

        Assert.Equal("{}", await File.ReadAllTextAsync(Path.Combine(target, "schemas/json/layout/a.json")));
        Assert.Equal("js", await File.ReadAllTextAsync(Path.Combine(target, "altinn-app-frontend.js")));
    }

    [Fact]
    public async Task CopyToDirectory_OverwritesExistingAndKeepsUnrelatedFiles()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Bundle, ("altinn-app-frontend.js", "new"));
        var bundle = await provider.GetLayerAsync("4", AppDistLayer.Bundle);
        Assert.NotNull(bundle);
        var target = Path.Combine(_tempDir, "www");
        Directory.CreateDirectory(target);
        await File.WriteAllTextAsync(Path.Combine(target, "altinn-app-frontend.js"), "old");
        await File.WriteAllTextAsync(Path.Combine(target, "unrelated.txt"), "keep");

        await bundle.CopyToDirectoryAsync(target);

        Assert.Equal("new", await File.ReadAllTextAsync(Path.Combine(target, "altinn-app-frontend.js")));
        Assert.Equal("keep", await File.ReadAllTextAsync(Path.Combine(target, "unrelated.txt")));
    }

    [Fact]
    public async Task CopyToDirectory_PathEscapingEntryThrows()
    {
        var (provider, _, store) = Setup();
        await store.WriteAsync(
            "4",
            AppDistLayer.Schemas,
            [new AppDistFileEntry("../escape.json", "{}"u8.ToArray())],
            CancellationToken.None
        );
        var schemas = await provider.GetLayerAsync("4", AppDistLayer.Schemas);
        Assert.NotNull(schemas);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            schemas.CopyToDirectoryAsync(Path.Combine(_tempDir, "www"))
        );
        Assert.Contains("escape", ex.Message);
    }

    [Fact]
    public async Task ListVersions_ReturnsSourceVersions()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("3", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));

        Assert.Equal(["3", "4"], await provider.ListVersionsAsync());
    }

    [Fact]
    public async Task ListVersions_OfflineReturnsNull()
    {
        var (provider, source, _) = Setup();
        source.Offline = true;

        Assert.Null(await provider.ListVersionsAsync());
    }

    [Fact]
    public async Task ListCachedVersions_ReflectsStorePerLayer()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", AppDistLayer.Schemas, ("schemas/json/a.json", "{}"));
        await provider.GetLayerAsync("4", AppDistLayer.Schemas);

        Assert.Equal(["4"], await provider.ListCachedVersionsAsync(AppDistLayer.Schemas));
        Assert.Empty(await provider.ListCachedVersionsAsync(AppDistLayer.Bundle));
    }
}
