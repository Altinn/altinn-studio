using System;
using System.IO;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Designer.Tests.TestAttributes;
using LibGit2Sharp;
using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository;

public sealed class LibGit2ConfigurationTests : IDisposable
{
    private const string LinkTarget = "README.md";
    private readonly string _directory = Directory.CreateTempSubdirectory().FullName;
    private readonly Signature _signature = new("test", "test@example.com", DateTimeOffset.Now);

    public LibGit2ConfigurationTests()
    {
        LibGit2Configuration.DisableSymbolicLinks();
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void DisableSymbolicLinks_CloneWithCommittedLink_ChecksOutPlainFileHoldingLinkTarget()
    {
        string remotePath = CreateRemoteWithLink("linked-file");

        string clonePath = Repository.Clone(remotePath, Path.Join(_directory, "clone"));

        using Repository clone = new(clonePath);
        string linkedFilePath = Path.Join(clone.Info.WorkingDirectory, "linked-file");
        Assert.Null(new FileInfo(linkedFilePath).LinkTarget);
        Assert.Equal(LinkTarget, File.ReadAllText(linkedFilePath));
        Assert.False(clone.RetrieveStatus().IsDirty);
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void DisableSymbolicLinks_PullWithNewLink_ChecksOutPlainFileHoldingLinkTarget()
    {
        string remotePath = CreateRemoteWithLink("linked-file");
        using Repository clone = new(Repository.Clone(remotePath, Path.Join(_directory, "clone")));
        CommitLink(remotePath, "new-linked-file");

        Commands.Pull(clone, _signature, new PullOptions());

        string linkedFilePath = Path.Join(clone.Info.WorkingDirectory, "new-linked-file");
        Assert.Null(new FileInfo(linkedFilePath).LinkTarget);
        Assert.Equal(LinkTarget, File.ReadAllText(linkedFilePath));
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void DisableSymbolicLinks_StageAllAndCommit_KeepsCommittedLink()
    {
        string remotePath = CreateRemoteWithLink("linked-file");
        using Repository clone = new(Repository.Clone(remotePath, Path.Join(_directory, "clone")));
        File.WriteAllText(Path.Join(clone.Info.WorkingDirectory, "README.md"), "changed");

        Commands.Stage(clone, "*");
        clone.Commit("Change readme", _signature, _signature);

        Assert.Equal(Mode.SymbolicLink, clone.Head.Tip["linked-file"].Mode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("[core]\n\tsymlinks = true\n")]
    public void AssertSymbolicLinksDisabled_SymbolicLinksNotDisabled_ThrowsInvalidOperationException(
        string systemConfiguration
    )
    {
        using Configuration configuration = BuildConfiguration(systemConfiguration);

        Assert.Throws<InvalidOperationException>(() => LibGit2Configuration.AssertSymbolicLinksDisabled(configuration));
    }

    [Fact]
    public void AssertSymbolicLinksDisabled_SymbolicLinksDisabled_DoesNotThrow()
    {
        using Configuration configuration = BuildConfiguration("[core]\n\tsymlinks = false\n");

        LibGit2Configuration.AssertSymbolicLinksDisabled(configuration);
    }

    public void Dispose()
    {
        Directory.Delete(_directory, recursive: true);
    }

    private string CreateRemoteWithLink(string linkName)
    {
        string remotePath = Path.Join(_directory, "remote");
        Repository.Init(remotePath);
        File.WriteAllText(Path.Join(remotePath, "README.md"), "readme");
        CommitLink(remotePath, linkName);
        return remotePath;
    }

    private void CommitLink(string repositoryPath, string linkName)
    {
        using Repository repository = new(repositoryPath);
        File.CreateSymbolicLink(Path.Join(repositoryPath, linkName), LinkTarget);
        Commands.Stage(repository, "*");
        repository.Commit($"Add {linkName}", _signature, _signature);
    }

    /// <summary>
    /// Builds a configuration from explicit files only, so that the git configuration of the machine running the
    /// test cannot change the outcome.
    /// </summary>
    private Configuration BuildConfiguration(string systemConfiguration)
    {
        string emptyConfigurationPath = Path.Join(_directory, "empty-gitconfig");
        string systemConfigurationPath = Path.Join(_directory, "system-gitconfig");
        File.WriteAllText(emptyConfigurationPath, string.Empty);
        File.WriteAllText(systemConfigurationPath, systemConfiguration);
        return Configuration.BuildFrom(
            emptyConfigurationPath,
            emptyConfigurationPath,
            emptyConfigurationPath,
            systemConfigurationPath
        );
    }
}
