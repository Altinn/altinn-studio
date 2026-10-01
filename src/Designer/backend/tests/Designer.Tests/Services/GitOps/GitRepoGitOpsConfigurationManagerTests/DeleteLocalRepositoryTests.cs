using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.Services.GitOps.GitRepoGitOpsConfigurationManagerTests;

public class DeleteLocalRepositoryTests : GitRepoGitOpsConfigurationManagerTestsBase<DeleteLocalRepositoryTests>
{
    private const string DeletionFailedMessage = "Failed to delete local repository directory";

    [Fact]
    public async Task WhenDirectoryDeletionFails_ShouldLogWarning()
    {
        Given.That.LocalRepositoryExists().And.MakeRepositoryDirectoryUndeletable();
        var warningLogged = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        MockLogger
            .Setup(logger =>
                logger.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString().Contains(DeletionFailedMessage)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()
                )
            )
            .Callback(new InvocationAction(_ => warningLogged.TrySetResult()));

        await And.When.EnsureGitOpsConfigurationExistsCalled("tt02");

        // Deletion continues in the background after the request returns.
        await warningLogged.Task.WaitAsync(TimeSpan.FromSeconds(10));

        Then.LoggerShouldHaveLoggedWarning();
    }

    private DeleteLocalRepositoryTests LocalRepositoryExists()
    {
        // Repository already exists from test setup
        return this;
    }

    private DeleteLocalRepositoryTests MakeRepositoryDirectoryUndeletable()
    {
        // Create a subdirectory and lock it to simulate deletion failure
        string repoPath = AltinnGitRepository.RepositoryDirectory;
        string lockedSubDir = Path.Combine(repoPath, "locked");
        Directory.CreateDirectory(lockedSubDir);

        // Create a file stream that keeps the directory locked
        string lockFile = Path.Combine(lockedSubDir, "lockfile.txt");
        File.WriteAllText(lockFile, "locked");

        // Set directory to read-only to prevent deletion
        var dirInfo = new DirectoryInfo(lockedSubDir);
        dirInfo.Attributes |= FileAttributes.ReadOnly;

        return this;
    }

    private async Task EnsureGitOpsConfigurationExistsCalled(string environment)
    {
        await GitOpsConfigurationManager.EnsureGitOpsConfigurationExistsAsync(
            OrgEditingContext,
            AltinnEnvironment.FromName(environment)
        );
    }

    private DeleteLocalRepositoryTests LoggerShouldHaveLoggedWarning()
    {
        MockLogger.Verify(
            x =>
                x.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString().Contains(DeletionFailedMessage)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()
                ),
            Times.AtLeastOnce
        );

        return this;
    }

    public override async Task DisposeAsync()
    {
        RemoveReadOnlyAttributesFromRepository();
        DeleteScheduledForDeleteDirectories();
        await base.DisposeAsync();
    }

    private void RemoveReadOnlyAttributesFromRepository()
    {
        string repoPath = AltinnGitRepository.RepositoryDirectory;
        if (Directory.Exists(repoPath))
        {
            RemoveReadOnlyAttributes(new DirectoryInfo(repoPath));
        }
    }

    private void DeleteScheduledForDeleteDirectories()
    {
        string repoPath = AltinnGitRepository.RepositoryDirectory;
        string parentDirectory = Directory.GetParent(repoPath)?.FullName;

        if (parentDirectory != null && Directory.Exists(parentDirectory))
        {
            var scheduledDirectories = Directory.GetDirectories(parentDirectory, "*_SCHEDULED_FOR_DELETE_*");
            foreach (var dir in scheduledDirectories)
            {
                RemoveReadOnlyAttributes(new DirectoryInfo(dir));
                Directory.Delete(dir, true);
            }
        }
    }

    private void RemoveReadOnlyAttributes(DirectoryInfo directory)
    {
        foreach (var file in directory.GetFiles())
        {
            file.Attributes &= ~FileAttributes.ReadOnly;
        }

        foreach (var subDir in directory.GetDirectories())
        {
            subDir.Attributes &= ~FileAttributes.ReadOnly;
            RemoveReadOnlyAttributes(subDir);
        }
    }
}
