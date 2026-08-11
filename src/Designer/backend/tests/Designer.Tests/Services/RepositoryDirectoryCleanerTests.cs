using System;
using System.IO;
using Altinn.Studio.Designer.Services.Implementation;
using Xunit;

namespace Designer.Tests.Services;

public sealed class RepositoryDirectoryCleanerTests : IDisposable
{
    private readonly string _rootDirectory = Directory.CreateTempSubdirectory().FullName;
    private readonly RepositoryDirectoryCleaner _cleaner = new();

    [Fact]
    public void TryDeleteIfEmpty_DeletesEmptyDirectoryNonRecursively()
    {
        string directoryPath = Directory.CreateDirectory(Path.Combine(_rootDirectory, "empty")).FullName;

        bool deleted = _cleaner.TryDeleteIfEmpty(directoryPath);

        Assert.True(deleted);
        Assert.False(Directory.Exists(directoryPath));
    }

    [Fact]
    public void TryDeleteIfEmpty_SkipsDirectoryWhenEntryExists()
    {
        string directoryPath = Directory.CreateDirectory(Path.Combine(_rootDirectory, "not-empty")).FullName;
        File.WriteAllText(Path.Combine(directoryPath, "created-concurrently.txt"), "content");

        bool deleted = _cleaner.TryDeleteIfEmpty(directoryPath);

        Assert.False(deleted);
        Assert.True(Directory.Exists(directoryPath));
        Assert.True(File.Exists(Path.Combine(directoryPath, "created-concurrently.txt")));
    }

    public void Dispose()
    {
        Directory.Delete(_rootDirectory, recursive: true);
    }
}
