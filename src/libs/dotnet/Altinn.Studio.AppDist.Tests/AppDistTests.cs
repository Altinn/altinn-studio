using Xunit;

namespace Altinn.Studio.AppDist.Tests;

public sealed class AppDistTests
{
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
}
