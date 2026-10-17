using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Tests.Internal.App;

public sealed class ParsedAppFilesTests : IDisposable
{
    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("ParsedAppFiles-");

    public void Dispose() => _appDir.Delete(recursive: true);

    [Fact]
    public void Parse_keeps_the_snapshot_and_has_no_diagnostics()
    {
        TestAppFiles.WriteMinimalApplicationMetadata(_appDir.FullName);
        var files = AppFilesLoader.Load(_appDir.FullName);

        var parsed = ParsedAppFiles.Parse(files);

        Assert.Same(files, parsed.Files);
        Assert.Empty(parsed.Diagnostics);
    }
}
