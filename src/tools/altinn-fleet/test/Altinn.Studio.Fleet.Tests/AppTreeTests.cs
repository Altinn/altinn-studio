using System.Formats.Tar;
using System.Security.Cryptography;
using System.Text;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Store;

namespace Altinn.Studio.Fleet.Tests;

public sealed class AppTreeTests : IDisposable
{
    private readonly string _root = Folder.CreateTemporary();

    [Fact]
    public async Task Extract_LeavesOutWhatCouldEscapeTheFolderOrHoldSecrets()
    {
        byte[] archive = new TarBuilder("app")
            .File("App/App.csproj", "<Project />")
            .RawFile("app/../escape.txt", "x"u8.ToArray())
            .RawFile("app/App/../../escape2.txt", "x"u8.ToArray())
            .RawFile("/etc/absolute.txt", "x"u8.ToArray())
            .RawFile("other/outside.txt", "x"u8.ToArray())
            .RawFile("app/a//b.txt", "x"u8.ToArray())
            .File(".env", "SECRET=1")
            .File("App/.ENV", "SECRET=1")
            .File("App/.env.example", "SAFE=1")
            .Entry(TarEntryType.SymbolicLink, "app/link", "/etc/passwd")
            .Entry(TarEntryType.HardLink, "app/hard", "app/App/App.csproj")
            .Entry(TarEntryType.CharacterDevice, "app/device")
            .Entry(TarEntryType.Fifo, "app/pipe")
            .Build();

        AppFiles files = await Extract(archive);

        Assert.Equal(["App", "App/.env.example", "App/App.csproj"], Folder.Tree(Path.Join(_root, "out")));
        Assert.Equal(["App/.env.example", "App/App.csproj"], files.Files.Select(f => f.Path.Value));
        Assert.Equal(
            [
                ("app/../escape.txt", "a path outside the archive's folder"),
                ("app/App/../../escape2.txt", "a path outside the archive's folder"),
                ("/etc/absolute.txt", "an absolute or invalid path"),
                ("other/outside.txt", "a path outside the archive's folder"),
                ("app/a//b.txt", "a path outside the archive's folder"),
                (".env", "a file named .env, which can hold secrets"),
                ("App/.ENV", "a file named .env, which can hold secrets"),
                ("link", "a symbolic link"),
                ("hard", "a hard link"),
                ("device", "a device or pipe"),
                ("pipe", "a device or pipe"),
            ],
            files.Skipped.Select(s => (s.Path, s.Reason))
        );
        Assert.False(File.Exists(Path.Join(_root, "escape.txt")));
    }

    [Fact]
    public async Task Extract_HashesEveryFileAndFeedsTheReaderTheSameBytes()
    {
        string csproj =
            "<Project><ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"8.1.0\" /></ItemGroup></Project>";
        byte[] large = new byte[3 << 20];
        Random.Shared.NextBytes(large);
        byte[] archive = new TarBuilder("app").File("App/App.csproj", csproj).RawFile("app/large.bin", large).Build();
        var reader = new AppDescriptionReader();

        AppFiles files = await Extract(archive, reader);

        Assert.Equal(
            [
                new FileRecord(
                    AppPath("App/App.csproj"),
                    csproj.Length,
                    Sha256Digest.Of(SHA256.HashData(Encoding.UTF8.GetBytes(csproj)))
                ),
                new FileRecord(AppPath("large.bin"), large.Length, Sha256Digest.Of(SHA256.HashData(large))),
            ],
            files.Files
        );
        Assert.Equal(csproj.Length + large.Length, files.Bytes);
        Assert.Equal(large, File.ReadAllBytes(Path.Join(_root, "out", "large.bin")));
        var description = Assert.IsType<AppDescription.FormApp.V8OrEarlier>(reader.Build());
        Assert.Equal("8.1.0", description.AltinnApp?.Version);
    }

    [Fact]
    public async Task Scan_ReadsBackWhatExtractWrote()
    {
        byte[] archive = TarBuilder.App("app", "1").File("deep/er/file.txt", "text").Build();
        var extractReader = new AppDescriptionReader();
        AppFiles extracted = await Extract(archive, extractReader);
        var scanReader = new AppDescriptionReader();

        using var tree = new AppTree();
        AppFiles scanned = tree.Scan(Path.Join(_root, "out"), scanReader, TestContext.Current.CancellationToken);

        Assert.Equal(extracted.Files, scanned.Files);
        Assert.Equal(extracted.Bytes, scanned.Bytes);
        var fromArchive = Assert.IsType<AppDescription.FormApp.V8OrEarlier>(extractReader.Build());
        Assert.Equal<AppDescription>(fromArchive, scanReader.Build());
    }

    [Fact]
    public async Task Extract_RejectsWhatIsNotAnArchive()
    {
        await Assert.ThrowsAsync<InvalidArchiveException>(() => Extract([1, 2, 3]));
    }

    [Fact]
    public async Task Extract_TreatsAnArchiveThatEndsEarlyAsANetworkError()
    {
        byte[] archive = new TarBuilder("app").RawFile("app/big.bin", new byte[100_000]).Build();

        await Assert.ThrowsAnyAsync<IOException>(() => Extract([]));
        await Assert.ThrowsAnyAsync<IOException>(() => Extract(archive[..(archive.Length / 2)]));
    }

    [Theory]
    [InlineData("app/x", "x")]
    [InlineData("app/x/", "x")]
    [InlineData("app/", "")]
    [InlineData("app", "")]
    [InlineData("app/a/b.c", "a/b.c")]
    [InlineData("app/..x", "..x")]
    [InlineData("app/./x", null)]
    [InlineData("app/a\\x", null)]
    [InlineData("other/x", null)]
    [InlineData("/app/x", null)]
    public void EntryPath_StripsTheTopLevelFolder(string name, string? expected)
    {
        var names = new ArchiveEntryPath.Reader();
        names.Read("app/");

        string? path = names.Read(name) switch
        {
            ArchiveEntryPath.Root => "",
            ArchiveEntryPath.InApp inApp => inApp.Path.Value,
            _ => null,
        };

        Assert.Equal(expected, path);
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private async Task<AppFiles> Extract(byte[] archive, AppDescriptionReader? reader = null)
    {
        using var tree = new AppTree();
        using var stream = new MemoryStream(archive);
        return await tree.Extract(
            stream,
            Path.Join(_root, "out"),
            reader ?? new AppDescriptionReader(),
            TestContext.Current.CancellationToken
        );
    }

    private static AppFilePath AppPath(string relativePath) =>
        AppTree.TryPath(relativePath, out AppFilePath? path)
            ? path
            : throw new ArgumentException($"'{relativePath}' is not a path inside an app.", nameof(relativePath));
}
