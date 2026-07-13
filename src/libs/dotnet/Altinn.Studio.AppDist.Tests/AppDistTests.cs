using System.Text;
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

    private static async Task<string> ReadAsync(Stream? stream)
    {
        Assert.NotNull(stream);
        await using (stream)
        using (var reader = new StreamReader(stream, Encoding.UTF8))
        {
            return await reader.ReadToEndAsync();
        }
    }

    [Fact]
    public async Task GetFile_FetchesAndReturnsContent()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", (AppDist.JsonSchemas.Layout, """{"type":"object"}"""));

        var content = await ReadAsync(await provider.GetFileAsync("4", AppDist.JsonSchemas.Layout));

        Assert.Equal("""{"type":"object"}""", content);
    }

    [Fact]
    public async Task GetFile_SecondCallHitsStoreOnly()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", ("schemas/json/a.json", "{}"));
        await ReadAsync(await provider.GetFileAsync("4", "schemas/json/a.json"));

        await ReadAsync(await provider.GetFileAsync("4", "schemas/json/a.json"));

        Assert.Equal(1, source.FetchRequests);
    }

    [Fact]
    public async Task GetFile_OfflineFallsBackToStore()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", ("schemas/json/a.json", "{}"));
        await ReadAsync(await provider.GetFileAsync("4", "schemas/json/a.json"));

        source.Offline = true;
        var content = await ReadAsync(await provider.GetFileAsync("4", "schemas/json/a.json"));

        Assert.Equal("{}", content);
    }

    [Fact]
    public async Task GetFile_OfflineWithoutStoredCopyReturnsNull()
    {
        var (provider, source, _) = Setup();
        source.Offline = true;

        Assert.Null(await provider.GetFileAsync("4", AppDist.JsonSchemas.Layout));
    }

    [Fact]
    public async Task GetFile_MissingFileInStoredVersionThrows()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", ("schemas/json/a.json", "{}"));

        var ex = await Assert.ThrowsAsync<FileNotFoundException>(() =>
            provider.GetFileAsync("4", "schemas/json/missing.json")
        );
        Assert.Contains("missing.json", ex.Message);
    }

    [Fact]
    public async Task ListFiles_ReturnsSortedPaths()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", ("schemas/json/b.json", "{}"), ("index.html", "<html/>"));

        var files = await provider.ListFilesAsync("4");

        string[] expected = ["index.html", "schemas/json/b.json"];
        Assert.Equal(expected, files);
    }

    [Fact]
    public async Task ListFiles_OfflineWithoutStoredCopyReturnsNull()
    {
        var (provider, source, _) = Setup();
        source.Offline = true;

        Assert.Null(await provider.ListFilesAsync("4"));
    }

    [Fact]
    public async Task StoredVersionIsNeverRefetched()
    {
        var (provider, source, _) = Setup();
        source.AddFiles("4", ("schemas/json/a.json", "{}"));

        await provider.ListFilesAsync("4");
        await provider.ListFilesAsync("4");

        Assert.Equal(1, source.FetchRequests);
    }
}
