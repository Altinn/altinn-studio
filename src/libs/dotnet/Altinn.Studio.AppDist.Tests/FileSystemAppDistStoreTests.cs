using System.Text;
using Xunit;

namespace Altinn.Studio.AppDist.Tests;

public sealed class FileSystemAppDistStoreTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory("appdist-store-tests-").FullName;
    private readonly FileSystemAppDistStore _store;

    public FileSystemAppDistStoreTests() => _store = new FileSystemAppDistStore(_root);

    public void Dispose() => Directory.Delete(_root, recursive: true);

    [Fact]
    public async Task EntryRoundTrips()
    {
        var files = new[]
        {
            new AppDistFileEntry("schemas/json/b.json", "{}"u8.ToArray()),
            new AppDistFileEntry("schemas/json/a.json", """{"a":1}"""u8.ToArray()),
        };

        Assert.False(await _store.ContainsAsync("4", CancellationToken.None));
        await _store.WriteAsync("4", files, CancellationToken.None);

        Assert.True(await _store.ContainsAsync("4", CancellationToken.None));
        string[] expected = ["schemas/json/a.json", "schemas/json/b.json"];
        Assert.Equal(expected, await _store.ListFilesAsync("4", CancellationToken.None));
        await using var stream = await _store.OpenFileAsync("4", "schemas/json/a.json", CancellationToken.None);
        Assert.NotNull(stream);
        using var reader = new StreamReader(stream, Encoding.UTF8);
        Assert.Equal("""{"a":1}""", await reader.ReadToEndAsync());
    }

    [Fact]
    public async Task Write_ReplacesPreviousContents()
    {
        await _store.WriteAsync("4", [new AppDistFileEntry("old.json", "{}"u8.ToArray())], CancellationToken.None);

        await _store.WriteAsync("4", [new AppDistFileEntry("new.json", "{}"u8.ToArray())], CancellationToken.None);

        string[] expected = ["new.json"];
        Assert.Equal(expected, await _store.ListFilesAsync("4", CancellationToken.None));
    }

    [Fact]
    public async Task OpenFile_UnknownPathOrVersion_ReturnsNull()
    {
        await _store.WriteAsync("4", [new AppDistFileEntry("a.json", "{}"u8.ToArray())], CancellationToken.None);

        Assert.Null(await _store.OpenFileAsync("4", "missing.json", CancellationToken.None));
        Assert.Null(await _store.OpenFileAsync("5", "a.json", CancellationToken.None));
    }

    [Fact]
    public async Task OpenFile_PathEscapingEntry_Throws()
    {
        await _store.WriteAsync("4", [new AppDistFileEntry("a.json", "{}"u8.ToArray())], CancellationToken.None);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _store.OpenFileAsync("4", "../4.fetched", CancellationToken.None)
        );
    }

    [Fact]
    public async Task UnsafeVersion_Throws()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _store.ContainsAsync("../evil", CancellationToken.None));
    }
}
