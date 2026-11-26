using System.Formats.Tar;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Store;

namespace Altinn.Studio.Fleet.Tests;

public sealed class AppFolderTests : IDisposable
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

        using var folder = new AppFolder();
        AppFiles scanned = folder.Scan(Path.Join(_root, "out"), scanReader, TestContext.Current.CancellationToken);

        Assert.Equal(extracted.Files, scanned.Files);
        Assert.Equal(extracted.Bytes, scanned.Bytes);
        var fromArchive = Assert.IsType<AppDescription.FormApp.V8OrEarlier>(extractReader.Build());
        Assert.Equal<AppDescription>(fromArchive, scanReader.Build());
    }

    [Fact]
    public async Task Extract_KeepsTheFirstEntryForAPath()
    {
        byte[] archive = new TarBuilder("app")
            .File("App/a.txt", "first")
            .File("App/a.txt", "second")
            .Directory("App/folder")
            .File("App/folder", "a file where a folder is")
            .File("App/file", "a file")
            .Directory("App/file")
            .File("App/file/below.txt", "below a file")
            .Build();

        AppFiles files = await Extract(archive);

        Assert.Equal(["App", "App/a.txt", "App/file", "App/folder"], Folder.Tree(Path.Join(_root, "out")));
        Assert.Equal("first", File.ReadAllText(Path.Join(_root, "out", "App", "a.txt")));
        Assert.Equal(["App/a.txt", "App/file"], files.Files.Select(f => f.Path.Value));
        Assert.Equal(["App/a.txt", "App/folder", "App/file", "App/file/below.txt"], files.Skipped.Select(s => s.Path));
        Assert.All(files.Skipped, s => Assert.Equal("a path that an earlier entry took", s.Reason));
    }

    [Fact]
    public async Task Extract_KeepsWritingIntoAFolderAFileLostToByCase()
    {
        byte[] archive = new TarBuilder("app")
            .File("App/Assets/icon.svg", "<svg />")
            .File("App/assets", "a file")
            .File("App/assets/next.svg", "<svg />")
            .Build();
        string probe = Path.Join(_root, "Probe");
        Directory.CreateDirectory(probe);
        bool ignoresCase = Directory.Exists(Path.Join(_root, "probe"));

        AppFiles files = await Extract(archive);

        Assert.Equal(
            ignoresCase ? ["App/Assets/icon.svg", "App/assets/next.svg"] : ["App/Assets/icon.svg", "App/assets"],
            files.Files.Select(f => f.Path.Value)
        );
        Assert.Equal(ignoresCase ? ["App/assets"] : ["App/assets/next.svg"], files.Skipped.Select(s => s.Path));
    }

    [Fact]
    public async Task Extract_KeepsAFileWhoseNameDiffersFromAFolderOnlyInCase()
    {
        byte[] archive = new TarBuilder("app")
            .File("App/Assets", "a file")
            .File("App/assets/icon.svg", "<svg />")
            .Build();
        string probe = Path.Join(_root, "Probe");
        Directory.CreateDirectory(probe);
        bool ignoresCase = Directory.Exists(Path.Join(_root, "probe"));

        AppFiles files = await Extract(archive);

        Assert.True(File.Exists(Path.Join(_root, "out", "App", "Assets")));
        Assert.Equal(
            ignoresCase ? ["App/Assets"] : ["App/Assets", "App/assets/icon.svg"],
            files.Files.Select(f => f.Path.Value)
        );
        Assert.Equal(ignoresCase ? ["App/assets/icon.svg"] : [], files.Skipped.Select(s => s.Path));
    }

    [Theory]
    [InlineData("App/App.csproj", true)]
    [InlineData("App/.env.example", true)]
    [InlineData("App/con.txt", false)]
    [InlineData("App/Aux", false)]
    [InlineData("lpt1/x", false)]
    [InlineData("App/console.txt", true)]
    [InlineData("App/COM¹.txt", false)]
    [InlineData("App/lpt³", false)]
    [InlineData("App/COM0", true)]
    [InlineData("App/a:b", false)]
    [InlineData("App/what?", false)]
    [InlineData("App/trailing.", false)]
    [InlineData("App/trailing ", false)]
    [InlineData("App/tab\there", false)]
    public void WindowsPath_LeavesOutWhatWindowsCannotStore(string path, bool expected)
    {
        Assert.Equal(expected, ArchiveEntryPath.Reader.IsWindowsPath(path));
    }

    [Fact]
    public async Task Extract_OnWindowsLeavesOutNamesWindowsDoesNotAllow()
    {
        Assert.SkipUnless(OperatingSystem.IsWindows(), "Only Windows leaves these names out");
        byte[] archive = new TarBuilder("app").File("App/ok.txt", "x").File("App/con.txt", "x").Build();

        AppFiles files = await Extract(archive);

        Assert.Equal(["App/ok.txt"], files.Files.Select(f => f.Path.Value));
        Assert.Equal([("App/con.txt", "a name Windows does not allow")], files.Skipped.Select(s => (s.Path, s.Reason)));
    }

    [Fact]
    public async Task Extract_RejectsAnAppLargerThanTheLimit()
    {
        byte[] archive = new TarBuilder("app").File("App/big.bin", "x").Build();
        byte[] tar = Gunzip(archive);
        int header = FindHeader(tar, "app/App/big.bin");
        Encoding
            .ASCII.GetBytes(Convert.ToString(AppFolder.MaxAppBytes + 1, 8).PadLeft(11, '0') + "\0")
            .CopyTo(tar, header + 124);
        SetChecksum(tar, header);

        InvalidArchiveException error = await Assert.ThrowsAsync<InvalidArchiveException>(() => Extract(Gzip(tar)));
        Assert.Contains("larger than", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Extract_RejectsAnArchiveWithTooManyEntries()
    {
        var builder = new TarBuilder("app");
        for (int i = 0; i < AppFolder.MaxEntries; i++)
        {
            builder.Entry(TarEntryType.Fifo, "app/pipe");
        }

        InvalidArchiveException error = await Assert.ThrowsAsync<InvalidArchiveException>(() =>
            Extract(builder.Build())
        );
        Assert.Contains("more than", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Extract_RejectsAHeaderLargerThanTheReaderAccepts()
    {
        using var tar = new MemoryStream();
        using (var writer = new TarWriter(tar, TarEntryFormat.Pax, leaveOpen: true))
        {
            writer.WriteEntry(new PaxTarEntry(TarEntryType.Directory, "app/"));
            writer.WriteEntry(
                new PaxTarEntry(
                    TarEntryType.RegularFile,
                    "app/x",
                    new Dictionary<string, string> { ["comment"] = new string('a', 1 << 20) }
                )
            );
        }

        await Assert.ThrowsAsync<InvalidArchiveException>(() => Extract(Gzip(tar.ToArray())));
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
        using var folder = new AppFolder();
        using var stream = new MemoryStream(archive);
        return await folder.Extract(
            stream,
            Path.Join(_root, "out"),
            reader ?? new AppDescriptionReader(),
            TestContext.Current.CancellationToken
        );
    }

    private static byte[] Gunzip(byte[] gzipped)
    {
        using var output = new MemoryStream();
        using (var gzip = new GZipStream(new MemoryStream(gzipped), CompressionMode.Decompress))
        {
            gzip.CopyTo(output);
        }

        return output.ToArray();
    }

    private static byte[] Gzip(byte[] data)
    {
        using var output = new MemoryStream();
        using (var gzip = new GZipStream(output, CompressionLevel.Fastest, leaveOpen: true))
        {
            gzip.Write(data);
        }

        return output.ToArray();
    }

    // The offset of the ustar header block whose name field is the name.
    private static int FindHeader(byte[] tar, string name)
    {
        byte[] field = Encoding.ASCII.GetBytes(name + "\0");
        for (int offset = 0; offset < tar.Length; offset += 512)
        {
            if (tar.AsSpan(offset, field.Length).SequenceEqual(field))
            {
                return offset;
            }
        }

        throw new InvalidOperationException($"No header for {name}.");
    }

    private static void SetChecksum(byte[] tar, int header)
    {
        Span<byte> block = tar.AsSpan(header, 512);
        block.Slice(148, 8).Fill((byte)' ');
        int sum = 0;
        foreach (byte b in block)
        {
            sum += b;
        }

        Encoding.ASCII.GetBytes(Convert.ToString(sum, 8).PadLeft(6, '0') + "\0 ").CopyTo(block[148..]);
    }

    private static AppFilePath AppPath(string relativePath) =>
        AppFolder.TryPath(relativePath, out AppFilePath? path)
            ? path
            : throw new ArgumentException($"'{relativePath}' is not a path inside an app.", nameof(relativePath));
}
