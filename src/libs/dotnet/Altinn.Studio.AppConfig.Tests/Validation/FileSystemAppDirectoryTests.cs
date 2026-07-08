using System.Text;
using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class FileSystemAppDirectoryTests : IDisposable
{
    private readonly string _root;
    private readonly FileSystemAppDirectory _dir;

    public FileSystemAppDirectoryTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "appconfig-fs-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
        _dir = new FileSystemAppDirectory(_root);
    }

    public void Dispose()
    {
        Directory.Delete(_root, recursive: true);
    }

    [Fact]
    public void WriteAllBytes_CreatesParentDirectories_AndFile()
    {
        _dir.WriteAllBytes("a/b/c/file.json", Encoding.UTF8.GetBytes("hello"));
        Assert.True(File.Exists(Path.Combine(_root, "a", "b", "c", "file.json")));
        Assert.Equal(Encoding.UTF8.GetBytes("hello"), _dir.ReadAllBytes("a/b/c/file.json"));
    }

    [Fact]
    public void WriteAllBytes_OverwritesExistingFile()
    {
        _dir.WriteAllBytes("a.json", Encoding.UTF8.GetBytes("first"));
        _dir.WriteAllBytes("a.json", Encoding.UTF8.GetBytes("second"));
        Assert.Equal(Encoding.UTF8.GetBytes("second"), _dir.ReadAllBytes("a.json"));
    }

    [Fact]
    public void Delete_RemovesExistingFile()
    {
        _dir.WriteAllBytes("a.json", [1]);
        _dir.Delete("a.json");
        Assert.False(_dir.Exists("a.json"));
    }

    [Fact]
    public void Delete_ThrowsOnMissingFile()
    {
        var act = () => _dir.Delete("nothing-here.json");
        var ex = Assert.Throws<FileNotFoundException>(act);
        Assert.Contains("cannot delete", ex.Message);
    }

    [Fact]
    public void Rename_MovesFile_AndCreatesDestinationParents()
    {
        _dir.WriteAllBytes("a.json", Encoding.UTF8.GetBytes("payload"));
        _dir.Rename("a.json", "nested/sub/b.json");
        Assert.False(_dir.Exists("a.json"));
        Assert.Equal(Encoding.UTF8.GetBytes("payload"), _dir.ReadAllBytes("nested/sub/b.json"));
    }

    [Fact]
    public void Rename_ThrowsOnMissingSource()
    {
        var act = () => _dir.Rename("missing.json", "anywhere.json");
        var ex = Assert.Throws<FileNotFoundException>(act);
        Assert.Contains("source does not exist", ex.Message);
    }

    [Fact]
    public void Rename_ThrowsWhenDestinationExists()
    {
        _dir.WriteAllBytes("a.json", [1]);
        _dir.WriteAllBytes("b.json", [2]);
        var act = () => _dir.Rename("a.json", "b.json");
        var ex = Assert.Throws<IOException>(act);
        Assert.Contains("destination already exists", ex.Message);
        Assert.True(_dir.Exists("a.json"));
    }

    [Fact]
    public void Read_PathEscapingRoot_IsTreatedAsAbsent()
    {
        var outside = Path.Combine(Path.GetTempPath(), "outside-" + Guid.NewGuid().ToString("N") + ".json");
        File.WriteAllText(outside, "secret");
        try
        {
            var rel = "../" + Path.GetFileName(outside);
            Assert.False(_dir.Exists(rel));
            Assert.Null(_dir.ReadAllBytes(rel));
            Assert.Null(_dir.ReadRawBytes(rel));
        }
        finally
        {
            File.Delete(outside);
        }
    }

    [Fact]
    public void Read_RootedPath_IsTreatedAsAbsent()
    {
        Assert.False(_dir.Exists("/etc/hostname"));
        Assert.Null(_dir.ReadAllBytes("/etc/hostname"));
        Assert.Empty(_dir.EnumerateFiles("..", "*", recursive: true));
    }

    [Fact]
    public void Write_PathEscapingRoot_Throws()
    {
        var outside = Path.Combine(Path.GetTempPath(), "escape-" + Guid.NewGuid().ToString("N") + ".json");
        var rel = "../" + Path.GetFileName(outside);
        var act = () => _dir.WriteAllBytes(rel, [1]);
        var ex = Assert.Throws<ArgumentException>(act);
        Assert.Contains("escapes the app root", ex.Message);
        Assert.False(File.Exists(outside));
    }

    [Fact]
    public void Rename_DestinationEscapingRoot_Throws()
    {
        _dir.WriteAllBytes("a.json", [1]);
        var act = () => _dir.Rename("a.json", "../escaped.json");
        var ex = Assert.Throws<ArgumentException>(act);
        Assert.Contains("escapes the app root", ex.Message);
        Assert.True(_dir.Exists("a.json"));
    }
}
