using Altinn.Studio.AppConfig.Documents;

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
    public void Read_PathEscapingRoot_IsTreatedAsAbsent()
    {
        var outside = Path.Combine(Path.GetTempPath(), "outside-" + Guid.NewGuid().ToString("N") + ".json");
        File.WriteAllText(outside, "secret");
        try
        {
            var rel = "../" + Path.GetFileName(outside);
            Assert.False(_dir.Exists(rel));
            Assert.Null(_dir.ReadAllBytes(rel));
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
}
