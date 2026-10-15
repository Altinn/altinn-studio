using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Tests.Internal.App;

public sealed class AppFilesAccessorTests : IDisposable
{
    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("AppFilesAccessor-");

    public void Dispose() => _appDir.Delete(recursive: true);

    [Fact]
    public void The_parsed_files_are_the_current_snapshot()
    {
        TestAppFiles.WriteMinimalApplicationMetadata(_appDir.FullName);
        var files = AppFilesLoader.Load(_appDir.FullName);

        var accessor = new AppFilesAccessor(files);

        Assert.Same(files, accessor.Current);
        Assert.Same(accessor.Current, accessor.Parsed.Files);
    }

    [Fact]
    public void Update_replaces_the_snapshot_and_the_parsed_files_together()
    {
        TestAppFiles.WriteMinimalApplicationMetadata(_appDir.FullName);
        var accessor = new AppFilesAccessor(AppFilesLoader.Load(_appDir.FullName));
        var initial = accessor.Parsed;
        var files = AppFilesLoader.Load(_appDir.FullName);

        accessor.Update(files);

        Assert.Same(files, accessor.Current);
        Assert.Same(files, accessor.Parsed.Files);
        Assert.NotSame(initial, accessor.Parsed);
    }
}
