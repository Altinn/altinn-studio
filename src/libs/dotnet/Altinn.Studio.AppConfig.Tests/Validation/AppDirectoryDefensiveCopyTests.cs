using System.Text;
using Altinn.Studio.AppConfig.Documents;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class AppDirectoryDefensiveCopyTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory("appconfig-dir-tests-").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    [Fact]
    public void FileSystemReadAllBytes_MutatingResultDoesNotCorruptLaterReads()
    {
        var file = Path.Combine(_root, "App", "config");
        Directory.CreateDirectory(file);
        File.WriteAllText(Path.Combine(file, "applicationmetadata.json"), """{"id":"ttd/x"}""");
        var dir = new FileSystemAppDirectory(_root);

        var first = dir.ReadAllBytes("App/config/applicationmetadata.json");
        Assert.NotNull(first);
        Array.Fill(first, (byte)'!');

        var second = dir.ReadAllBytes("App/config/applicationmetadata.json");
        Assert.NotNull(second);
        Assert.Equal("""{"id":"ttd/x"}""", Encoding.UTF8.GetString(second));
    }

    [Fact]
    public void OverlayReadAllBytes_MutatingResultDoesNotCorruptLaterReads()
    {
        var overlay = new OverlayAppDirectory(new InMemoryAppDirectory());
        overlay.Set("App/config/applicationmetadata.json", """{"id":"ttd/x"}""");

        var first = overlay.ReadAllBytes("App/config/applicationmetadata.json");
        Assert.NotNull(first);
        Array.Fill(first, (byte)'!');

        var second = overlay.ReadAllBytes("App/config/applicationmetadata.json");
        Assert.NotNull(second);
        Assert.Equal("""{"id":"ttd/x"}""", Encoding.UTF8.GetString(second));
    }
}
