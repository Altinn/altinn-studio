using System;
using System.IO;
using System.Linq;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.TestAttributes;
using Xunit;

namespace Designer.Tests.Services;

public sealed class RepositoryDirectoryCleanerTests : IDisposable
{
    private readonly string _rootDirectory = Directory.CreateTempSubdirectory().FullName;
    private readonly RepositoryDirectoryCleaner _cleaner;

    public RepositoryDirectoryCleanerTests()
    {
        _cleaner = new RepositoryDirectoryCleaner(
            new ServiceRepositorySettings { RepositoryLocation = _rootDirectory }
        );
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void Delete_RemovesDirectoryLinksWithoutFollowingTargets()
    {
        string externalDirectory = Directory.CreateDirectory(Path.Combine(_rootDirectory, "external")).FullName;
        string externalFile = Path.Combine(externalDirectory, "keep.txt");
        File.WriteAllText(externalFile, "must remain");
        string repositoryPath = Directory.CreateDirectory(Path.Combine(_rootDirectory, "repository")).FullName;
        string linkPath = Path.Combine(repositoryPath, "external-link");
        Directory.CreateSymbolicLink(linkPath, externalDirectory);

        _cleaner.Delete(repositoryPath);

        Assert.False(Directory.Exists(repositoryPath));
        Assert.True(Directory.Exists(externalDirectory));
        Assert.True(File.Exists(externalFile));
        Assert.Equal("must remain", File.ReadAllText(externalFile));
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void Delete_RemovesRepositoryLinkWithoutFollowingTarget()
    {
        string externalDirectory = Directory
            .CreateDirectory(Path.Combine(_rootDirectory, "external-repository"))
            .FullName;
        string externalFile = Path.Combine(externalDirectory, "keep.txt");
        File.WriteAllText(externalFile, "must remain");
        string repositoryLink = Path.Combine(_rootDirectory, "repository-link");
        Directory.CreateSymbolicLink(repositoryLink, externalDirectory);

        _cleaner.Delete(repositoryLink);

        Assert.False(Directory.Exists(repositoryLink));
        Assert.True(Directory.Exists(externalDirectory));
        Assert.True(File.Exists(externalFile));
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void Delete_RemovesBrokenRepositoryLink()
    {
        string externalDirectory = Directory
            .CreateDirectory(Path.Combine(_rootDirectory, "external-repository"))
            .FullName;
        string repositoryLink = Path.Combine(_rootDirectory, "repository-link");
        Directory.CreateSymbolicLink(repositoryLink, externalDirectory);
        Directory.Delete(externalDirectory);

        _cleaner.Delete(repositoryLink);

        Assert.Null(new DirectoryInfo(repositoryLink).LinkTarget);
    }

    [Fact]
    public void EnumerateEntriesForDeletion_ReturnsGitMetadataLast()
    {
        var repositoryDirectory = Directory.CreateDirectory(Path.Combine(_rootDirectory, "repository"));
        Directory.CreateDirectory(Path.Combine(repositoryDirectory.FullName, ".git"));
        File.WriteAllText(Path.Combine(repositoryDirectory.FullName, "content.txt"), "content");

        string[] entryNames = RepositoryDirectoryCleaner
            .EnumerateEntriesForDeletion(repositoryDirectory, deleteGitMetadataLast: true)
            .Select(entry => entry.Name)
            .ToArray();

        Assert.Equal(2, entryNames.Length);
        Assert.Equal(".git", entryNames[^1]);
    }

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

    [Fact]
    public void PublicDeletionMethods_RejectPathsOutsideRepositoryRoot()
    {
        string outsideDirectory = Directory.CreateTempSubdirectory().FullName;
        try
        {
            Assert.Throws<ArgumentException>(() => _cleaner.Delete(outsideDirectory));
            Assert.Throws<ArgumentException>(() => _cleaner.TryDeleteIfEmpty(outsideDirectory));
            Assert.True(Directory.Exists(outsideDirectory));
        }
        finally
        {
            Directory.Delete(outsideDirectory);
        }
    }

    public void Dispose()
    {
        Directory.Delete(_rootDirectory, recursive: true);
    }
}
