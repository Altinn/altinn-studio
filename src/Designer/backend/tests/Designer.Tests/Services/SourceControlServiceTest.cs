using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using LibGit2Sharp;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using DesignerRepositoryStatus = Altinn.Studio.Designer.Enums.RepositoryStatus;

namespace Designer.Tests.Services;

public class SourceControlServiceTest : IDisposable
{
    private Mock<IHttpContextAccessor> _httpContextAccessorMock;
    private Mock<IGiteaClient> _giteaClientMock;
    private ServiceRepositorySettings _settings;
    private Mock<HttpContext> _httpContextMock;
    private SourceControlService _sourceControlService;

    private readonly string _org = "ttd";
    private readonly string _developer = "testUser";
    private string _repoDir;
    private readonly List<string> _extraDirsToCleanUp = [];

    private void Setup()
    {
        // Setup mocks
        _httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        _giteaClientMock = new Mock<IGiteaClient>();
        _httpContextMock = new Mock<HttpContext>();
        _httpContextMock
            .Setup(x => x.User)
            .Returns(new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "testUser")], "mock")));

        // Setup settings with a test repository location
        _settings = new ServiceRepositorySettings
        {
            RepositoryLocation = TestDataHelper.GetTestDataRepositoriesRootDirectory(),
            RepositoryBaseURL = "https://test.gitea.com",
        };

        // Setup HttpContextAccessor to return mock HttpContext
        _httpContextAccessorMock.Setup(x => x.HttpContext).Returns(_httpContextMock.Object);

        Mock<IGitServerAuthHeadersProvider> gitServerAuthHeadersProviderMock = new();
        gitServerAuthHeadersProviderMock.Setup(x => x.GetAuthHeaders()).Returns([]);

        // Create the service under test
        _sourceControlService = new SourceControlService(
            _settings,
            _giteaClientMock.Object,
            gitServerAuthHeadersProviderMock.Object
        );
    }

    [Fact]
    public void DeleteLocalBranchIfExists()
    {
        // Arrange
        string repoName = TestDataHelper.GenerateTestRepoName();
        string branchName = "feature-branch-to-delete";
        AltinnRepoEditingContext context = CreateTestRepository(repoName, branchName);

        // Act
        using (Repository repo = new(_repoDir))
        {
            Assert.Contains(repo.Branches, b => b.FriendlyName == branchName);
        }

        _sourceControlService.DeleteLocalBranchIfExists(context, branchName);

        // Assert
        using Repository finalRepoState = new(_repoDir);
        Assert.NotNull(finalRepoState);
        Assert.NotEmpty(finalRepoState.Branches);
        Assert.DoesNotContain(finalRepoState.Branches, b => b.FriendlyName == branchName);
    }

    [Fact]
    public void CreateLocalBranch()
    {
        // Arrange
        string repoName = TestDataHelper.GenerateTestRepoName();
        string branchName = "new-feature-branch";
        string commitSha = null;
        AltinnRepoEditingContext context = CreateTestRepository(repoName);

        // Act
        _sourceControlService.CreateLocalBranch(context, branchName, commitSha);

        // Assert
        using Repository finalRepoState = new(_repoDir);
        Assert.NotNull(finalRepoState);
        Assert.NotEmpty(finalRepoState.Branches);
        Assert.Equal(2, finalRepoState.Branches.Count()); // master + new branch
        Assert.Contains(finalRepoState.Branches, b => b.FriendlyName == branchName);
    }

    [Fact]
    public void CreateLocalBranch_WithCommitSha()
    {
        // Arrange
        string repoName = TestDataHelper.GenerateTestRepoName();
        string branchName = "new-feature-branch";
        AltinnRepoEditingContext context = CreateTestRepository(repoName);
        string defaultBranchName = GetHeadBranchName();
        string commitSha;
        using (Repository repo = new(_repoDir))
        {
            commitSha = repo.Head.Tip.Sha;
        }

        AddFileToRepo();
        _sourceControlService.CommitToLocalRepo(context, "commitMessage");

        // Act
        _sourceControlService.CreateLocalBranch(context, branchName, commitSha);

        // Assert
        using Repository finalRepoState = new(_repoDir);
        Assert.NotNull(finalRepoState);
        Assert.NotEmpty(finalRepoState.Branches);
        Assert.Equal(2, finalRepoState.Branches.Count()); // master + new branch
        Branch createdBranch = finalRepoState.Branches.Single(b => b.FriendlyName == branchName);
        Assert.NotNull(createdBranch);
        Assert.Equal(commitSha, createdBranch.Tip.Sha);
        Branch defaultBranch = finalRepoState.Branches.Single(b => b.FriendlyName == defaultBranchName);
        Assert.Equal("commitMessage", defaultBranch.Tip.MessageShort);
    }

    [Fact]
    public void CommitToLocalRepo()
    {
        // Arrange
        string repoName = TestDataHelper.GenerateTestRepoName();
        string commitMessage = "fixed everything!";
        AltinnRepoEditingContext context = CreateTestRepository(repoName);

        // Act
        AddFileToRepo();
        _sourceControlService.CommitToLocalRepo(context, commitMessage);

        // Assert
        using Repository finalRepoState = new(_repoDir);
        Assert.NotNull(finalRepoState);
        Assert.NotEmpty(finalRepoState.Commits);
        Assert.Equal(2, finalRepoState.Commits.Count()); // Initial commit + new commit
        Assert.Equal(commitMessage, finalRepoState.Head.Tip.MessageShort);
    }

    [Fact]
    public void CheckoutRepoOnBranch()
    {
        // Arrange
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnRepoEditingContext context = CreateTestRepository(repoName);
        string branchName = "new-feature-branch";

        _sourceControlService.CreateLocalBranch(context, branchName);

        // Act
        _sourceControlService.CheckoutRepoOnBranch(context, branchName);

        using Repository repository = new(_repoDir);

        // Assert
        Assert.Equal(2, repository.Branches.Count()); // new-feature-branch + master
        Assert.Equal(branchName, repository.Head.FriendlyName);
    }

    [Fact]
    public void RebaseOntoDefaultBranch()
    {
        // Arrange
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnRepoEditingContext context = CreateTestRepository(repoName);
        string defaultBranchName = GetHeadBranchName();
        string branchName = "new-feature-branch";
        string commitMessageFeature = "broke it again!";
        string commitMessageMaster = "fixed everything!";

        // Create a branch and add a commit
        _sourceControlService.CreateLocalBranch(context, branchName);
        _sourceControlService.CheckoutRepoOnBranch(context, branchName);
        AddFileToRepo("file-on-feature-branch");
        _sourceControlService.CommitToLocalRepo(context, commitMessageFeature);

        // Add a commit to master
        _sourceControlService.CheckoutRepoOnBranch(context, defaultBranchName);
        AddFileToRepo("file-on-master");
        _sourceControlService.CommitToLocalRepo(context, commitMessageMaster);

        // Act
        _sourceControlService.CheckoutRepoOnBranch(context, branchName);
        _sourceControlService.RebaseOntoDefaultBranch(context);

        // Assert
        using Repository repository = new(_repoDir);
        Assert.Equal(2, repository.Branches.Count()); // new-feature-branch + master
        Branch defaultBranch = repository.Branches.First(b => b.FriendlyName == defaultBranchName);
        Assert.Equal(2, defaultBranch.Commits.Count());
        Assert.Equal(commitMessageMaster, defaultBranch.Tip.MessageShort);

        Branch feature = repository.Branches.First(b => b.FriendlyName == branchName);
        Assert.Equal(3, feature.Commits.Count());
        Assert.Equal(commitMessageFeature, feature.Tip.MessageShort);
    }

    [Fact]
    public void MergeBranchIntoHead()
    {
        // Arrange
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnRepoEditingContext context = CreateTestRepository(repoName);
        string defaultBranchName = GetHeadBranchName();
        string branchName = "new-feature-branch";
        string commitMessage = "broke it again!";

        // Create a branch and add a commit
        _sourceControlService.CreateLocalBranch(context, branchName);
        _sourceControlService.CheckoutRepoOnBranch(context, branchName);
        AddFileToRepo("file-on-feature-branch");
        _sourceControlService.CommitToLocalRepo(context, commitMessage);

        // Act
        _sourceControlService.CheckoutRepoOnBranch(context, defaultBranchName);
        _sourceControlService.MergeBranchIntoHead(context, branchName);

        // Assert
        using Repository repository = new(_repoDir);
        Branch defaultBranch = repository.Branches.First(b => b.FriendlyName == defaultBranchName);
        Assert.Equal(2, defaultBranch.Commits.Count());
        Assert.Equal(commitMessage, defaultBranch.Tip.MessageShort);
    }

    [Fact]
    public async Task DeleteRepository_GiteaServiceIsCalled()
    {
        // Arrange
        string org = "ttd";
        string origApp = "hvem-er-hvem";
        string app = TestDataHelper.GenerateTestRepoName(origApp);
        string developer = "testUser";
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

        await TestDataHelper.CopyRepositoryForTest(org, origApp, developer, app);

        Mock<IGiteaClient> mock = new();
        mock.Setup(m => m.DeleteRepository(org, app)).ReturnsAsync(true);

        SourceControlService sut = GetServiceForTest(developer, mock);

        // Act
        await sut.DeleteRepository(editingContext);
        string expectedPath = TestDataHelper.GetTestDataRepositoryDirectory(org, app, developer);

        // Assert
        mock.VerifyAll();
        Assert.False(Directory.Exists(expectedPath));
    }

    [Fact]
    public async Task CreatePullRequest_InputMappedCorectlyToCreatePullRequestOption()
    {
        // Arrange
        string target = "master";
        string source = "branch";
        string user = "testUser";

        Mock<IGiteaClient> mock = new();
        mock.Setup(m =>
                m.CreatePullRequest(
                    "ttd",
                    "apps-test",
                    It.Is<CreatePullRequestOption>(o => o.Base == target && o.Head == source)
                )
            )
            .ReturnsAsync(true);
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            "ttd",
            "apps-test",
            user
        );

        SourceControlService sut = GetServiceForTest(user, mock);

        // Act
        await sut.CreatePullRequest(editingContext, target, source, "title");

        // Assert
        mock.VerifyAll();
    }

    [Fact]
    public void GetChangedContent_OnMasterBranch_ReturnsUncommittedChanges()
    {
        // Arrange
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromEditingContext(CreateTestRepository(repoName), "dummytoken");

        string testFile = Path.Join(_repoDir, "uncommitted-file.txt");
        File.WriteAllText(testFile, "This is new content");

        // Act
        var result = _sourceControlService.GetChangedContent(authenticatedContext);

        // Assert
        Assert.Single(result);
        Assert.Contains("uncommitted-file.txt", result.Keys);
    }

    [Fact]
    public void GetChangedContent_OnFeatureBranch_ReturnsOnlyUncommittedChanges()
    {
        // Arrange
        string repoName = TestDataHelper.GenerateTestRepoName();
        const string BranchName = "feature-branch";
        var context = CreateTestRepository(repoName);
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromEditingContext(context, "dummytoken");

        // Create feature branch and commit a file
        _sourceControlService.CreateLocalBranch(context, BranchName);
        _sourceControlService.CheckoutRepoOnBranch(context, BranchName);

        string committedFile = Path.Join(_repoDir, "committed-on-feature.txt");
        File.WriteAllText(committedFile, "Committed content");

        using (var repo = new Repository(_repoDir))
        {
            Commands.Stage(repo, "committed-on-feature.txt");
            var signature = new LibGit2Sharp.Signature(_developer, $"{_developer}@test.com", DateTimeOffset.Now);
            repo.Commit("Add file on feature branch", signature, signature);
        }

        // Add uncommitted file
        string uncommittedFile = Path.Join(_repoDir, "uncommitted-on-feature.txt");
        File.WriteAllText(uncommittedFile, "Uncommitted content");

        // Act
        var result = _sourceControlService.GetChangedContent(authenticatedContext);

        // Assert
        Assert.Single(result);
        Assert.Contains("uncommitted-on-feature.txt", result.Keys);
        Assert.DoesNotContain("committed-on-feature.txt", result.Keys);
    }

    [Fact]
    public void GetChangedContent_NoChanges_ReturnsEmptyDictionary()
    {
        // Arrange
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromEditingContext(CreateTestRepository(repoName), "dummytoken");

        // Act
        var result = _sourceControlService.GetChangedContent(authenticatedContext);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public void PullRemoteChanges_DirtyAndOnlyBehind_FastForwardsWithoutLosingLocalChanges()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );

        CommitAndPushChange(collaboratorRepoPath, "remote-only.txt", "remote content", "remote update");
        File.WriteAllText(Path.Join(localRepoPath, "local-only.txt"), "local dirty content");

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.Ok, status.RepositoryStatus);
        using Repository localRepo = new(localRepoPath);
        Assert.True(localRepo.RetrieveStatus(new StatusOptions()).IsDirty);
        Assert.Empty(localRepo.Index.Conflicts);
        Assert.True(File.Exists(Path.Join(localRepoPath, "remote-only.txt")));
        Assert.Equal("local dirty content", File.ReadAllText(Path.Join(localRepoPath, "local-only.txt")));
    }

    [Fact]
    public void PullRemoteChanges_DirtyAndOnlyBehind_ReturnsCheckoutConflictWhenFastForwardWouldOverwrite()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );

        using Repository repoBeforePull = new(localRepoPath);
        string headBeforePull = repoBeforePull.Head.Tip.Sha;

        CommitAndPushChange(
            collaboratorRepoPath,
            "test.txt",
            """
            line one
            remote line two
            line three
            line four
            line five
            line six
            line seven
            line eight
            line nine
            line ten
            line eleven
            line twelve
            """,
            "remote conflicting update"
        );
        File.WriteAllText(
            Path.Join(localRepoPath, "test.txt"),
            """
            line one
            local line two
            line three
            line four
            line five
            line six
            line seven
            line eight
            line nine
            line ten
            line eleven
            line twelve
            """
        );

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.CheckoutConflict, status.RepositoryStatus);
        using Repository localRepo = new(localRepoPath);
        Assert.Equal(headBeforePull, localRepo.Head.Tip.Sha);
        Assert.True(localRepo.RetrieveStatus(new StatusOptions()).IsDirty);
        Assert.Empty(localRepo.Index.Conflicts);
        string fileContent = File.ReadAllText(Path.Join(localRepoPath, "test.txt"));
        Assert.Contains("local line two", fileContent);
        Assert.DoesNotContain("remote line two", fileContent);
    }

    [Fact]
    public void PullRemoteChanges_DirtyAndDiverged_ReturnsCheckoutConflictWithoutChangingAnything()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string headBeforePull;

        using (Repository localRepo = new(localRepoPath))
        {
            File.WriteAllText(Path.Join(localRepoPath, "test.txt"), "local committed change");
            Commands.Stage(localRepo, "test.txt");
            var signature = new LibGit2Sharp.Signature(_developer, $"{_developer}@test.com", DateTimeOffset.Now);
            localRepo.Commit("local committed update", signature, signature);
            headBeforePull = localRepo.Head.Tip.Sha;
        }

        CommitAndPushChange(collaboratorRepoPath, "remote-only.txt", "remote content", "remote update");
        File.WriteAllText(Path.Join(localRepoPath, "local-only.txt"), "dirty change");

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.CheckoutConflict, status.RepositoryStatus);
        using Repository localRepoAfterPull = new(localRepoPath);
        Assert.Equal(headBeforePull, localRepoAfterPull.Head.Tip.Sha);
        Assert.False(File.Exists(Path.Join(localRepoPath, "remote-only.txt")));
        Assert.Equal("dirty change", File.ReadAllText(Path.Join(localRepoPath, "local-only.txt")));
    }

    [Fact]
    public void PullRemoteChanges_DirtyAndDiverged_WhenTheChangesAreInTheWay_ReturnsCheckoutConflict()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string originalContent = File.ReadAllText(Path.Join(localRepoPath, "test.txt"));
        string headBeforePull = CommitLocalChange(localRepoPath, "local-only.txt", "local content", "local update");
        CommitAndPushChange(
            collaboratorRepoPath,
            "test.txt",
            originalContent.Replace("line two", "remote line two"),
            "remote update"
        );
        string uncommittedContent = originalContent.Replace("line eleven", "uncommitted line eleven");
        File.WriteAllText(Path.Join(localRepoPath, "test.txt"), uncommittedContent);

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.CheckoutConflict, status.RepositoryStatus);
        using Repository localRepoAfterPull = new(localRepoPath);
        Assert.Equal(headBeforePull, localRepoAfterPull.Head.Tip.Sha);
        Assert.False(localRepoAfterPull.Info.IsHeadDetached);
        Assert.Equal(uncommittedContent, File.ReadAllText(Path.Join(localRepoPath, "test.txt")));
    }

    [Fact]
    public void PullRemoteChanges_DirtyAndDiverged_KeepsUncommittedFilesInAFolderThatReplacesAFile()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        CommitLocalChange(localRepoPath, "local-only.txt", "local content", "local update");
        CommitChange(
            collaboratorRepoPath,
            root =>
            {
                File.Delete(Path.Join(root, "test.txt"));
                WriteFile(root, "test.txt/remote.txt", "remote content");
            },
            "remote replaces file with folder",
            push: true
        );
        File.Delete(Path.Join(localRepoPath, "test.txt"));
        WriteFile(localRepoPath, "test.txt/user.txt", "user content");

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.CheckoutConflict, status.RepositoryStatus);
        Assert.Equal("user content", File.ReadAllText(Path.Join(localRepoPath, "test.txt", "user.txt")));
    }

    [Fact]
    public void PullRemoteChanges_DivergedWithStagedChanges_ReturnsCheckoutConflict()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string headBeforePull = CommitLocalChange(localRepoPath, "local-only.txt", "local content", "local update");
        CommitAndPushChange(collaboratorRepoPath, "remote-only.txt", "remote content", "remote update");
        File.WriteAllText(Path.Join(localRepoPath, "staged.txt"), "staged content");
        using (Repository localRepo = new(localRepoPath))
        {
            Commands.Stage(localRepo, "staged.txt");
        }

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.CheckoutConflict, status.RepositoryStatus);
        using Repository localRepoAfterPull = new(localRepoPath);
        Assert.Equal(headBeforePull, localRepoAfterPull.Head.Tip.Sha);
        Assert.Equal(FileStatus.NewInIndex, localRepoAfterPull.RetrieveStatus(new StatusOptions())["staged.txt"].State);
    }

    [Fact]
    public void PullRemoteChanges_CleanAndDiverged_RebasesWithoutMergeCommit()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string localCommitSha;

        using (Repository localRepo = new(localRepoPath))
        {
            File.WriteAllText(
                Path.Join(localRepoPath, "test.txt"),
                """
                line one
                local line two
                line three
                line four
                line five
                line six
                line seven
                line eight
                line nine
                line ten
                line eleven
                line twelve
                """
            );
            Commands.Stage(localRepo, "test.txt");
            var signature = new LibGit2Sharp.Signature(_developer, $"{_developer}@test.com", DateTimeOffset.Now);
            localCommitSha = localRepo.Commit("local committed update", signature, signature).Sha;
        }

        string remoteCommitSha = CommitAndPushChange(
            collaboratorRepoPath,
            "remote-only.txt",
            "remote content",
            "remote update"
        );

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.Ok, status.RepositoryStatus);
        using Repository localRepoAfterPull = new(localRepoPath);
        Assert.NotEqual(localCommitSha, localRepoAfterPull.Head.Tip.Sha);
        Assert.Single(localRepoAfterPull.Head.Tip.Parents);
        Assert.Equal(remoteCommitSha, localRepoAfterPull.Head.Tip.Parents.Single().Sha);
    }

    [Fact]
    public void PullRemoteChanges_CleanAndDivergedWithConflicts_LeavesConflictsInWorkingDirectory()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string localCommitSha;

        using (Repository localRepo = new(localRepoPath))
        {
            File.WriteAllText(
                Path.Join(localRepoPath, "test.txt"),
                """
                line one
                local line two
                line three
                line four
                line five
                line six
                line seven
                line eight
                line nine
                line ten
                line eleven
                line twelve
                """
            );
            Commands.Stage(localRepo, "test.txt");
            var signature = new LibGit2Sharp.Signature(_developer, $"{_developer}@test.com", DateTimeOffset.Now);
            localCommitSha = localRepo.Commit("local committed update", signature, signature).Sha;
        }

        CommitAndPushChange(
            collaboratorRepoPath,
            "test.txt",
            """
            line one
            remote line two
            line three
            line four
            line five
            line six
            line seven
            line eight
            line nine
            line ten
            line eleven
            line twelve
            """,
            "remote conflicting update"
        );

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.MergeConflict, status.RepositoryStatus);
        using (Repository localRepoAfterPull = new(localRepoPath))
        {
            Assert.Equal(localCommitSha, localRepoAfterPull.Head.Tip.Sha);
            Assert.Equal(CurrentOperation.Merge, localRepoAfterPull.Info.CurrentOperation);
            Assert.Equal("test.txt", Assert.Single(localRepoAfterPull.Index.Conflicts).Ours.Path);
        }
        string fileContent = File.ReadAllText(Path.Join(localRepoPath, "test.txt"));
        Assert.Contains("local line two", fileContent);
        Assert.Contains("remote line two", fileContent);

        Assert.Equal(
            DesignerRepositoryStatus.MergeConflict,
            _sourceControlService.RepositoryStatus(authenticatedContext).RepositoryStatus
        );
        Assert.Equal(
            DesignerRepositoryStatus.MergeConflict,
            _sourceControlService.PullRemoteChanges(authenticatedContext).RepositoryStatus
        );
    }

    [Fact]
    public void PullRemoteChanges_CleanAndDivergedWithLocalStudioCommit_KeepsTheStudioAuthor()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );

        string localCommitSha = CommitLocalChange(
            localRepoPath,
            "local-only.txt",
            "local content",
            "local studio update",
            General.StudioCommitEmailDomain
        );
        CommitAndPushChange(collaboratorRepoPath, "remote-only.txt", "remote content", "remote update");

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.Ok, status.RepositoryStatus);
        using Repository localRepoAfterPull = new(localRepoPath);
        Assert.NotEqual(localCommitSha, localRepoAfterPull.Head.Tip.Sha);
        Assert.Equal("local studio update", localRepoAfterPull.Head.Tip.MessageShort);
        Assert.Equal($"{_developer}@{General.StudioCommitEmailDomain}", localRepoAfterPull.Head.Tip.Author.Email);
    }

    [Fact]
    public void PullRemoteChanges_WhenOnlyAnIntermediateLocalCommitConflicts_MergesWithoutLeavingAConflict()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string originalContent = File.ReadAllText(Path.Join(localRepoPath, "test.txt"));
        CommitLocalChange(
            localRepoPath,
            "test.txt",
            originalContent.Replace("line two", "local line two"),
            "local update"
        );
        CommitLocalChange(localRepoPath, "test.txt", originalContent, "undo local update");
        CommitLocalChange(localRepoPath, "local-only.txt", "local content", "add local file");
        CommitAndPushChange(
            collaboratorRepoPath,
            "test.txt",
            originalContent.Replace("line two", "remote line two"),
            "remote update"
        );

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.Ok, status.RepositoryStatus);
        using Repository localRepo = new(localRepoPath);
        Assert.Equal(CurrentOperation.None, localRepo.Info.CurrentOperation);
        Assert.False(localRepo.RetrieveStatus(new StatusOptions()).IsDirty);
        Assert.Contains("remote line two", File.ReadAllText(Path.Join(localRepoPath, "test.txt")));
        Assert.True(File.Exists(Path.Join(localRepoPath, "local-only.txt")));
    }

    [Fact]
    public void PullRemoteChanges_WithLocalMergeCommit_KeepsChangesMadeInTheMerge()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        using (Repository localRepo = new(localRepoPath))
        {
            Branch sideBranch = localRepo.CreateBranch("side");
            Commands.Checkout(localRepo, sideBranch);
            CommitLocalChange(localRepoPath, "side.txt", "side content", "side update");
            Commands.Checkout(localRepo, localRepo.Branches[General.DefaultBranch]);
            CommitLocalChange(localRepoPath, "main.txt", "main content", "main update");

            var signature = new LibGit2Sharp.Signature(_developer, $"{_developer}@test.com", DateTimeOffset.Now);
            localRepo.Merge(sideBranch, signature, new MergeOptions { CommitOnSuccess = false });
            File.WriteAllText(Path.Join(localRepoPath, "merge-only.txt"), "made in the merge");
            Commands.Stage(localRepo, "merge-only.txt");
            localRepo.Commit("merge side", signature, signature);
        }
        CommitAndPushChange(collaboratorRepoPath, "remote-only.txt", "remote content", "remote update");

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.Ok, status.RepositoryStatus);
        Assert.Equal("made in the merge", File.ReadAllText(Path.Join(localRepoPath, "merge-only.txt")));
        Assert.True(File.Exists(Path.Join(localRepoPath, "side.txt")));
        Assert.True(File.Exists(Path.Join(localRepoPath, "main.txt")));
        Assert.True(File.Exists(Path.Join(localRepoPath, "remote-only.txt")));
    }

    [Theory]
    [InlineData("delete", "rename:nations.txt")]
    [InlineData("rename:nations.txt", "delete")]
    [InlineData("rename:nations.txt", "rename:lands.txt")]
    public void RebaseOntoRemoteBranch_WhenARenameMeetsADeleteOrAnotherRename_LeavesAConflict(
        string localOperation,
        string remoteOperation
    )
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        CommitChange(collaboratorRepoPath, root => ChangeTestFile(root, remoteOperation), "remote change", push: true);
        CommitChange(localRepoPath, root => ChangeTestFile(root, localOperation), "local change");

        RemoteRebaseResult result = _sourceControlService.RebaseOntoRemoteBranch(
            authenticatedContext,
            General.DefaultBranch
        );

        Assert.Equal(RebaseStatus.Conflicts, result.Status);
        using Repository localRepo = new(localRepoPath);
        Assert.NotEmpty(localRepo.Index.Conflicts);
    }

    [Theory]
    [InlineData("rename:renamed.txt", "edit")]
    [InlineData("edit", "rename:renamed.txt")]
    public void RebaseOntoRemoteBranch_WhenARenameMeetsAnEdit_KeepsBothOnALinearHistory(
        string localOperation,
        string remoteOperation
    )
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        CommitChange(collaboratorRepoPath, root => ChangeTestFile(root, remoteOperation), "remote change", push: true);
        CommitChange(localRepoPath, root => ChangeTestFile(root, localOperation), "local change");

        RemoteRebaseResult result = _sourceControlService.RebaseOntoRemoteBranch(
            authenticatedContext,
            General.DefaultBranch
        );

        Assert.Equal(RebaseStatus.Complete, result.Status);
        using Repository localRepo = new(localRepoPath);
        Assert.Equal("local change", localRepo.Head.Tip.MessageShort);
        Assert.Single(localRepo.Head.Tip.Parents);
        Assert.False(File.Exists(Path.Join(localRepoPath, "test.txt")));
        Assert.Contains("edited line two", File.ReadAllText(Path.Join(localRepoPath, "renamed.txt")));
    }

    [Theory]
    [InlineData("foo", "foo/bar.json")]
    [InlineData("foo/bar.json", "foo")]
    public void RebaseOntoRemoteBranch_WhenAFileMeetsAFolderWithTheSameName_LeavesAConflict(
        string localPath,
        string remotePath
    )
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        CommitChange(collaboratorRepoPath, root => WriteFile(root, remotePath, "remote"), "remote change", push: true);
        CommitChange(localRepoPath, root => WriteFile(root, localPath, "local"), "local change");

        RemoteRebaseResult result = _sourceControlService.RebaseOntoRemoteBranch(
            authenticatedContext,
            General.DefaultBranch
        );

        Assert.Equal(RebaseStatus.Conflicts, result.Status);
        Assert.Equal(
            DesignerRepositoryStatus.MergeConflict,
            _sourceControlService.RepositoryStatus(authenticatedContext).RepositoryStatus
        );
    }

    [Fact]
    public void PullRemoteChanges_WhenALocalChangeIsUndoneLater_KeepsTheSameRemoteChange()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string originalContent = File.ReadAllText(Path.Join(localRepoPath, "test.txt"));
        string remoteContent = originalContent.Replace("line two", "edited line two");
        CommitAndPushChange(collaboratorRepoPath, "test.txt", remoteContent, "remote update");
        CommitLocalChange(localRepoPath, "test.txt", remoteContent, "same update as remote");
        CommitLocalChange(localRepoPath, "test.txt", originalContent, "undo update");
        CommitLocalChange(localRepoPath, "local-only.txt", "local content", "add local file");

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.Ok, status.RepositoryStatus);
        Assert.Equal(remoteContent, File.ReadAllText(Path.Join(localRepoPath, "test.txt")));
        Assert.True(File.Exists(Path.Join(localRepoPath, "local-only.txt")));
    }

    [Fact]
    public void PullRemoteChanges_WhenTheIndexIsLocked_ChangesNothing()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string remoteTipSha = CommitAndPushChange(
            collaboratorRepoPath,
            "remote-only.txt",
            "remote content",
            "remote update"
        );
        string localCommitSha = CommitLocalChange(localRepoPath, "local-only.txt", "local content", "local update");
        string lockPath = Path.Join(localRepoPath, ".git", "index.lock");
        File.WriteAllText(lockPath, string.Empty);

        Assert.ThrowsAny<LibGit2SharpException>(() => _sourceControlService.PullRemoteChanges(authenticatedContext));

        File.Delete(lockPath);
        using (Repository localRepo = new(localRepoPath))
        {
            Assert.Equal(localCommitSha, localRepo.Head.Tip.Sha);
            Assert.Equal(CurrentOperation.None, localRepo.Info.CurrentOperation);
            Assert.False(localRepo.RetrieveStatus(new StatusOptions()).IsDirty);
            Assert.False(File.Exists(Path.Join(localRepoPath, "remote-only.txt")));
        }

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.Ok, status.RepositoryStatus);
        using Repository pulledRepo = new(localRepoPath);
        Assert.Equal(remoteTipSha, Assert.Single(pulledRepo.Head.Tip.Parents).Sha);
        Assert.True(File.Exists(Path.Join(localRepoPath, "remote-only.txt")));
    }

    [Fact]
    public void PullRemoteChanges_WhenALockStopsTheBranchMove_SharingPublishesBothChanges()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string remoteContent = File.ReadAllText(Path.Join(localRepoPath, "test.txt"))
            .Replace("line two", "remote line two");
        string remoteTipSha = CommitAndPushChange(collaboratorRepoPath, "test.txt", remoteContent, "remote update");
        string localCommitSha = CommitLocalChange(localRepoPath, "local-only.txt", "local content", "local update");
        string lockPath = Path.Join(localRepoPath, ".git", "refs", "heads", "master.lock");
        File.WriteAllText(lockPath, string.Empty);

        Assert.ThrowsAny<LibGit2SharpException>(() => _sourceControlService.PullRemoteChanges(authenticatedContext));

        // The merge has updated the files and is left in progress, as when a merge cannot commit.
        File.Delete(lockPath);
        using (Repository localRepo = new(localRepoPath))
        {
            Assert.Equal(localCommitSha, localRepo.Head.Tip.Sha);
            Assert.Equal(CurrentOperation.Merge, localRepo.Info.CurrentOperation);
            Assert.Empty(localRepo.Index.Conflicts);
        }

        _sourceControlService.PushChangesForRepository(authenticatedContext, new CommitInfo { Message = "share" });

        using Repository sharedRepo = new(localRepoPath);
        Assert.Equal(sharedRepo.Branches[$"origin/{General.DefaultBranch}"].Tip.Sha, sharedRepo.Head.Tip.Sha);
        Assert.Equal(
            [localCommitSha, remoteTipSha],
            sharedRepo.Head.Tip.Parents.Select(parent => parent.Sha).ToArray()
        );
        Assert.Equal(CurrentOperation.None, sharedRepo.Info.CurrentOperation);
        Assert.Equal(remoteContent, File.ReadAllText(Path.Join(localRepoPath, "test.txt")));
        Assert.True(File.Exists(Path.Join(localRepoPath, "local-only.txt")));
    }

    [Fact]
    public void RebaseOntoRemoteBranch_WhenAnUncommittedFolderReplacesAChangedFile_KeepsTheFolder()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string remoteContent = File.ReadAllText(Path.Join(localRepoPath, "test.txt"))
            .Replace("line two", "remote line two");
        CommitAndPushChange(collaboratorRepoPath, "test.txt", remoteContent, "remote update");
        string localCommitSha = CommitLocalChange(localRepoPath, "local-only.txt", "local content", "local update");
        File.Delete(Path.Join(localRepoPath, "test.txt"));
        WriteFile(localRepoPath, "test.txt/user.txt", "user content");

        Assert.Throws<CheckoutConflictException>(() =>
            _sourceControlService.RebaseOntoRemoteBranch(authenticatedContext, General.DefaultBranch)
        );

        using Repository localRepo = new(localRepoPath);
        Assert.Equal(localCommitSha, localRepo.Head.Tip.Sha);
        Assert.Equal("user content", File.ReadAllText(Path.Join(localRepoPath, "test.txt", "user.txt")));
    }

    [Fact]
    public void RebaseOntoRemoteBranch_WithAnUncommittedFileOutOfTheWay_KeepsItUncommitted()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string remoteTipSha = CommitAndPushChange(
            collaboratorRepoPath,
            "remote-only.txt",
            "remote content",
            "remote update"
        );
        CommitLocalChange(localRepoPath, "local-only.txt", "local content", "local update");
        string uncommittedContent = File.ReadAllText(Path.Join(localRepoPath, "test.txt"))
            .Replace("line two", "uncommitted line two");
        File.WriteAllText(Path.Join(localRepoPath, "test.txt"), uncommittedContent);
        WriteFile(localRepoPath, "untracked.txt", "untracked content");

        RemoteRebaseResult result = _sourceControlService.RebaseOntoRemoteBranch(
            authenticatedContext,
            General.DefaultBranch
        );

        Assert.Equal(RebaseStatus.Complete, result.Status);
        using Repository localRepo = new(localRepoPath);
        Assert.Equal(remoteTipSha, Assert.Single(localRepo.Head.Tip.Parents).Sha);
        Assert.Equal(CurrentOperation.None, localRepo.Info.CurrentOperation);
        Assert.NotNull(localRepo.Head.Tip["local-only.txt"]);
        Assert.NotNull(localRepo.Head.Tip["remote-only.txt"]);
        Assert.Null(localRepo.Head.Tip["untracked.txt"]);
        RepositoryStatus repositoryStatus = localRepo.RetrieveStatus(new StatusOptions());
        Assert.Equal(FileStatus.ModifiedInWorkdir, repositoryStatus["test.txt"].State);
        Assert.Equal(FileStatus.NewInWorkdir, repositoryStatus["untracked.txt"].State);
        Assert.Equal(uncommittedContent, File.ReadAllText(Path.Join(localRepoPath, "test.txt")));
    }

    [Fact]
    public void RebaseOntoRemoteBranch_WithSeveralLocalCommits_CombinesThemOnTopOfTheRemoteBranch()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        string remoteCommitSha = CommitAndPushChange(
            collaboratorRepoPath,
            "remote-only.txt",
            "remote content",
            "remote update"
        );
        CommitLocalChange(localRepoPath, "first.txt", "first", "first local update");
        CommitLocalChange(localRepoPath, "second.txt", "second", "second local update");

        RemoteRebaseResult result = _sourceControlService.RebaseOntoRemoteBranch(
            authenticatedContext,
            General.DefaultBranch
        );

        Assert.Equal(RebaseStatus.Complete, result.Status);
        using Repository localRepo = new(localRepoPath);
        Assert.Equal(remoteCommitSha, Assert.Single(localRepo.Head.Tip.Parents).Sha);
        Assert.Equal("first local update\n\nsecond local update\n", localRepo.Head.Tip.Message);
        Assert.True(File.Exists(Path.Join(localRepoPath, "first.txt")));
        Assert.True(File.Exists(Path.Join(localRepoPath, "second.txt")));
        Assert.True(File.Exists(Path.Join(localRepoPath, "remote-only.txt")));
    }

    [Fact]
    public void RebaseOntoRemoteBranch_ForABranchThatIsNotCheckedOut_Throws()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );
        using (Repository collaboratorRepo = new(collaboratorRepoPath))
        {
            collaboratorRepo.Network.Push(
                collaboratorRepo.Network.Remotes["origin"],
                $"refs/heads/{General.DefaultBranch}:refs/heads/other",
                new PushOptions()
            );
        }

        Assert.Throws<InvalidOperationException>(() =>
            _sourceControlService.RebaseOntoRemoteBranch(authenticatedContext, "other")
        );
    }

    [Fact]
    public void PullRemoteChanges_RepoInitializedFromEmptyRemote_PullsRemoteChanges()
    {
        string repoName = TestDataHelper.GenerateTestRepoName();
        AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateRepositoryFromEmptyRemote(
            repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        );

        CommitAndPushChange(collaboratorRepoPath, "remote-only.txt", "remote content", "remote update");

        RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

        Assert.Equal(DesignerRepositoryStatus.Ok, status.RepositoryStatus);
        Assert.True(File.Exists(Path.Join(localRepoPath, "remote-only.txt")));
    }

    private static HttpContext GetHttpContextForTestUser(string userName)
    {
        List<Claim> claims = new();
        claims.Add(new Claim(ClaimTypes.Name, userName));
        ClaimsIdentity identity = new("TestUserLogin");
        identity.AddClaims(claims);

        ClaimsPrincipal principal = new(identity);
        HttpContext c = new DefaultHttpContext();
        c.Request.HttpContext.User = principal;

        return c;
    }

    private static SourceControlService GetServiceForTest(string developer, Mock<IGiteaClient> giteaMock = null)
    {
        HttpContext ctx = GetHttpContextForTestUser(developer);

        Mock<IHttpContextAccessor> httpContextAccessorMock = new();
        httpContextAccessorMock.Setup(s => s.HttpContext).Returns(ctx);

        giteaMock ??= new Mock<IGiteaClient>();

        string unitTestFolder = Path.GetDirectoryName(
            new Uri(typeof(RepositoryServiceTests).Assembly.Location).LocalPath
        );
        var repoSettings = new ServiceRepositorySettings()
        {
            RepositoryLocation =
                Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "Repositories")
                + Path.DirectorySeparatorChar,
        };

        SourceControlService service = new(
            repoSettings,
            giteaMock.Object,
            new Mock<IGitServerAuthHeadersProvider>().Object
        );

        return service;
    }

    [Fact]
    public void GetTopLevelFolderHistory_ReturnsFirstAuthorAndLastChangePerFolder()
    {
        // Arrange
        AltinnRepoEditingContext context = CreateEmptyTestRepository();
        using (Repository repo = new(_repoDir))
        {
            CommitFiles(repo, "alice", HistoryTime(1), "first/first_resource.json", "README.md");
            CommitFiles(repo, "bob", HistoryTime(2), "second/second_resource.json");
            CommitFiles(repo, "carol", HistoryTime(3), "first/first_policy.xml");
            SetRemoteDefaultBranch(repo, repo.Head.Tip);
        }

        // Act
        Dictionary<string, FolderHistory> history = _sourceControlService.GetTopLevelFolderHistory(context);

        // Assert
        Assert.Equal(2, history.Count);
        Assert.Equal(new FolderHistory("alice", HistoryTime(3)), history["first"]);
        Assert.Equal(new FolderHistory("bob", HistoryTime(2)), history["second"]);
    }

    [Fact]
    public void GetTopLevelFolderHistory_IgnoresCommitsThatAreNotOnTheRemoteDefaultBranch()
    {
        // Arrange
        AltinnRepoEditingContext context = CreateEmptyTestRepository();
        using (Repository repo = new(_repoDir))
        {
            CommitFiles(repo, "alice", HistoryTime(1), "first/first_resource.json");
            SetRemoteDefaultBranch(repo, repo.Head.Tip);
            CommitFiles(repo, "bob", HistoryTime(2), "first/first_policy.xml", "second/second_resource.json");
        }

        // Act
        Dictionary<string, FolderHistory> history = _sourceControlService.GetTopLevelFolderHistory(context);

        // Assert
        Assert.Equal(new FolderHistory("alice", HistoryTime(1)), Assert.Single(history).Value);
    }

    [Fact]
    public void GetTopLevelFolderHistory_AttributesMergedChangesToTheCommitsThatMadeThem()
    {
        // Arrange
        AltinnRepoEditingContext context = CreateEmptyTestRepository();
        using (Repository repo = new(_repoDir))
        {
            CommitFiles(repo, "alice", HistoryTime(1), "first/first_resource.json", "second/second_resource.json");
            Branch featureBranch = repo.CreateBranch("feature");
            Commands.Checkout(repo, featureBranch);
            CommitFiles(repo, "bob", HistoryTime(2), "second/second_policy.xml");
            Commands.Checkout(repo, repo.Branches[General.DefaultBranch]);
            CommitFiles(repo, "carol", HistoryTime(3), "first/first_policy.xml");
            LibGit2Sharp.Signature merger = new("dave", "dave@test.com", HistoryTime(4));
            repo.Merge(
                featureBranch,
                merger,
                new MergeOptions { FastForwardStrategy = FastForwardStrategy.NoFastForward }
            );
            SetRemoteDefaultBranch(repo, repo.Head.Tip);
        }

        // Act
        Dictionary<string, FolderHistory> history = _sourceControlService.GetTopLevelFolderHistory(context);

        // Assert
        Assert.Equal(new FolderHistory("alice", HistoryTime(3)), history["first"]);
        Assert.Equal(new FolderHistory("alice", HistoryTime(2)), history["second"]);
    }

    [Fact]
    public void GetTopLevelFolderHistory_SkipsChangesAMergeDiscardedAndCountsMergesThatChangedAFolder()
    {
        // Arrange
        AltinnRepoEditingContext context = CreateEmptyTestRepository();
        using (Repository repo = new(_repoDir))
        {
            CommitFiles(repo, "alice", HistoryTime(1), "first/first_resource.json", "second/second_resource.json");
            Branch featureBranch = repo.CreateBranch("feature");
            Commands.Checkout(repo, featureBranch);
            CommitFiles(repo, "bob", HistoryTime(2), "first/first_resource.json", "second/second_resource.json");
            LibGit2Sharp.Commit featureTip = repo.Head.Tip;
            Commands.Checkout(repo, repo.Branches[General.DefaultBranch]);
            CommitFiles(repo, "carol", HistoryTime(3), "third/third_resource.json");
            LibGit2Sharp.Commit defaultBranchTip = repo.Head.Tip;

            // The merge keeps the default branch's version of "first" and resolves "second" to new content.
            TreeDefinition mergedTree = TreeDefinition.From(defaultBranchTip.Tree);
            using MemoryStream resolvedContent = new("resolved"u8.ToArray());
            mergedTree.Add(
                "second/second_resource.json",
                repo.ObjectDatabase.CreateBlob(resolvedContent),
                Mode.NonExecutableFile
            );
            LibGit2Sharp.Signature merger = new("dave", "dave@test.com", HistoryTime(4));
            LibGit2Sharp.Commit merge = repo.ObjectDatabase.CreateCommit(
                merger,
                merger,
                "Merge feature",
                repo.ObjectDatabase.CreateTree(mergedTree),
                [defaultBranchTip, featureTip],
                prettifyMessage: true
            );
            SetRemoteDefaultBranch(repo, merge);
        }

        // Act
        Dictionary<string, FolderHistory> history = _sourceControlService.GetTopLevelFolderHistory(context);

        // Assert
        Assert.Equal(new FolderHistory("alice", HistoryTime(1)), history["first"]);
        Assert.Equal(new FolderHistory("alice", HistoryTime(4)), history["second"]);
        Assert.Equal(new FolderHistory("carol", HistoryTime(3)), history["third"]);
    }

    [Fact]
    public void GetTopLevelFolderHistory_WithoutRemoteDefaultBranch_ReturnsEmpty()
    {
        // Arrange
        AltinnRepoEditingContext context = CreateEmptyTestRepository();
        using (Repository repo = new(_repoDir))
        {
            CommitFiles(repo, "alice", HistoryTime(1), "first/first_resource.json");
        }

        // Act
        Dictionary<string, FolderHistory> history = _sourceControlService.GetTopLevelFolderHistory(context);

        // Assert
        Assert.Empty(history);
    }

    [Fact]
    public void GetTopLevelFolderHistory_FolderIsNotAGitRepository_ReturnsEmpty()
    {
        // Arrange
        Setup();
        string repoName = TestDataHelper.GenerateTestRepoName();
        _repoDir = TestDataHelper.GetTestDataRepositoryDirectory(_org, repoName, _developer);
        Directory.CreateDirectory(Path.Join(_repoDir, "first"));
        AltinnRepoEditingContext context = AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, repoName, _developer);

        // Act
        Dictionary<string, FolderHistory> history = _sourceControlService.GetTopLevelFolderHistory(context);

        // Assert
        Assert.Empty(history);
    }

    private static DateTimeOffset HistoryTime(int hour) => new(2026, 1, 1, hour, 0, 0, TimeSpan.Zero);

    private AltinnRepoEditingContext CreateEmptyTestRepository()
    {
        Setup();
        string repoName = TestDataHelper.GenerateTestRepoName();
        _repoDir = TestDataHelper.GetTestDataRepositoryDirectory(_org, repoName, _developer);
        Directory.CreateDirectory(_repoDir);
        Repository.Init(_repoDir);
        // Independent of the machine's init.defaultBranch setting.
        File.WriteAllText(Path.Join(_repoDir, ".git", "HEAD"), $"ref: refs/heads/{General.DefaultBranch}\n");

        return AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, repoName, _developer);
    }

    private void CommitFiles(Repository repo, string author, DateTimeOffset when, params string[] relativePaths)
    {
        foreach (string relativePath in relativePaths)
        {
            string filePath = Path.Join(_repoDir, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(filePath));
            File.WriteAllText(filePath, $"{relativePath} by {author}");
            Commands.Stage(repo, relativePath);
        }

        LibGit2Sharp.Signature signature = new(author, $"{author}@test.com", when);
        repo.Commit($"Change by {author}", signature, signature);
    }

    private static void SetRemoteDefaultBranch(Repository repo, LibGit2Sharp.Commit commit)
    {
        repo.Refs.Add($"refs/remotes/origin/{General.DefaultBranch}", commit.Id, allowOverwrite: true);
    }

    private AltinnRepoEditingContext CreateTestRepository(string repoName, string additionalBranch = null)
    {
        Setup();
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, repoName, _developer);
        _repoDir = TestDataHelper.GetTestDataRepositoryDirectory(_org, repoName, _developer);
        Directory.CreateDirectory(_repoDir);

        Repository.Init(_repoDir);

        using var repo = new Repository(_repoDir);

        string testFile = Path.Join(_repoDir, "test.txt");
        File.WriteAllText(testFile, "Initial content");

        Commands.Stage(repo, "test.txt");
        var signature = new LibGit2Sharp.Signature(_developer, $"{_developer}@test.com", DateTimeOffset.Now);
        repo.Commit("Initial commit", signature, signature);
        EnsureServiceDefaultBranch(repo);

        // Create additional branch if specified
        if (!string.IsNullOrEmpty(additionalBranch))
        {
            repo.CreateBranch(additionalBranch);
        }

        return editingContext;
    }

    private AltinnAuthenticatedRepoEditingContext CreateTrackedRepositoryForPull(
        string repoName,
        out string localRepoPath,
        out string collaboratorRepoPath
    )
    {
        Setup();
        _settings.RepositoryBaseURL = new Uri(
            TestDataHelper.GetTestDataRemoteRepositoryRootDirectory() + Path.DirectorySeparatorChar
        ).AbsoluteUri;
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            _org,
            repoName,
            _developer
        );

        localRepoPath = TestDataHelper.GetTestDataRepositoryDirectory(_org, repoName, _developer);
        string remoteRepoPath = $"{TestDataHelper.GetTestDataRemoteRepository(_org, repoName)}.git";
        collaboratorRepoPath = $"{remoteRepoPath}-collaborator";
        string seedRepoPath = $"{remoteRepoPath}-seed";

        _repoDir = localRepoPath;
        TrackDirectory(remoteRepoPath);
        TrackDirectory(collaboratorRepoPath);
        TrackDirectory(seedRepoPath);

        Directory.CreateDirectory(Path.GetDirectoryName(remoteRepoPath)!);
        Directory.CreateDirectory(Path.GetDirectoryName(localRepoPath)!);

        Repository.Init(seedRepoPath);
        using (Repository seedRepo = new(seedRepoPath))
        {
            File.WriteAllText(
                Path.Join(seedRepoPath, "test.txt"),
                """
                line one
                line two
                line three
                line four
                line five
                line six
                line seven
                line eight
                line nine
                line ten
                line eleven
                line twelve
                """
            );
            Commands.Stage(seedRepo, "test.txt");
            var signature = new LibGit2Sharp.Signature(_developer, $"{_developer}@test.com", DateTimeOffset.Now);
            seedRepo.Commit("Initial commit", signature, signature);
            EnsureServiceDefaultBranch(seedRepo);
        }

        Repository.Init(remoteRepoPath, true);
        using (Repository seedRepo = new(seedRepoPath))
        {
            Remote remote = seedRepo.Network.Remotes.Add("origin", remoteRepoPath);
            seedRepo.Network.Push(remote, $"refs/heads/{General.DefaultBranch}", new PushOptions());
        }

        Repository.Clone(remoteRepoPath, localRepoPath, new CloneOptions { BranchName = General.DefaultBranch });
        Repository.Clone(remoteRepoPath, collaboratorRepoPath, new CloneOptions { BranchName = General.DefaultBranch });

        return AltinnAuthenticatedRepoEditingContext.FromEditingContext(editingContext, "dummytoken");
    }

    private AltinnAuthenticatedRepoEditingContext CreateRepositoryFromEmptyRemote(
        string repoName,
        out string localRepoPath,
        out string collaboratorRepoPath
    )
    {
        Setup();
        _settings.RepositoryBaseURL = new Uri(
            TestDataHelper.GetTestDataRemoteRepositoryRootDirectory() + Path.DirectorySeparatorChar
        ).AbsoluteUri;
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            _org,
            repoName,
            _developer
        );

        localRepoPath = TestDataHelper.GetTestDataRepositoryDirectory(_org, repoName, _developer);
        string remoteRepoPath = $"{TestDataHelper.GetTestDataRemoteRepository(_org, repoName)}.git";
        collaboratorRepoPath = $"{remoteRepoPath}-collaborator";

        _repoDir = localRepoPath;
        TrackDirectory(remoteRepoPath);
        TrackDirectory(collaboratorRepoPath);

        Directory.CreateDirectory(Path.GetDirectoryName(remoteRepoPath)!);
        Directory.CreateDirectory(Path.GetDirectoryName(localRepoPath)!);
        Repository.Init(remoteRepoPath, true);
        using (Repository remoteRepo = new(remoteRepoPath))
        {
            remoteRepo.Refs.UpdateTarget("HEAD", $"refs/heads/{General.DefaultBranch}");
        }
        Repository.Clone(remoteRepoPath, localRepoPath);

        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromEditingContext(editingContext, "dummytoken");

        File.WriteAllText(Path.Join(localRepoPath, "test.txt"), "initial content");
        _sourceControlService.PushChangesForRepository(
            authenticatedContext,
            new CommitInfo { Message = "initial commit" }
        );

        Repository.Clone(remoteRepoPath, collaboratorRepoPath);
        return authenticatedContext;
    }

    private string CommitAndPushChange(
        string collaboratorRepoPath,
        string filePath,
        string content,
        string commitMessage
    )
    {
        using var collaboratorRepo = new Repository(collaboratorRepoPath);
        File.WriteAllText(Path.Join(collaboratorRepoPath, filePath), content);
        Commands.Stage(collaboratorRepo, filePath);
        var signature = new LibGit2Sharp.Signature(_developer, $"{_developer}@test.com", DateTimeOffset.Now);
        LibGit2Sharp.Commit commit = collaboratorRepo.Commit(commitMessage, signature, signature);
        collaboratorRepo.Network.Push(collaboratorRepo.Head, new PushOptions());
        return commit.Sha;
    }

    private string CommitLocalChange(
        string repoPath,
        string filePath,
        string content,
        string commitMessage,
        string emailDomain = "test.com"
    )
    {
        using var repo = new Repository(repoPath);
        File.WriteAllText(Path.Join(repoPath, filePath), content);
        Commands.Stage(repo, filePath);
        var signature = new LibGit2Sharp.Signature(_developer, $"{_developer}@{emailDomain}", DateTimeOffset.Now);
        return repo.Commit(commitMessage, signature, signature).Sha;
    }

    private static void CommitChange(string repoPath, Action<string> change, string commitMessage, bool push = false)
    {
        change(repoPath);
        using var repo = new Repository(repoPath);
        Commands.Stage(repo, "*");
        var signature = new LibGit2Sharp.Signature("someone", "someone@test.com", DateTimeOffset.Now);
        repo.Commit(commitMessage, signature, signature);
        if (push)
        {
            repo.Network.Push(repo.Head, new PushOptions());
        }
    }

    private static void ChangeTestFile(string repoPath, string operation)
    {
        string testFile = Path.Join(repoPath, "test.txt");
        if (operation == "delete")
        {
            File.Delete(testFile);
        }
        else if (operation == "edit")
        {
            File.WriteAllText(testFile, File.ReadAllText(testFile).Replace("line two", "edited line two"));
        }
        else
        {
            File.Move(testFile, Path.Join(repoPath, operation["rename:".Length..]));
        }
    }

    private static void WriteFile(string repoPath, string filePath, string content)
    {
        string fullPath = Path.Join(repoPath, filePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath));
        File.WriteAllText(fullPath, content);
    }

    private void AddFileToRepo(string filename = null)
    {
        string filePath = Path.Join(_repoDir, filename ?? "new-file.txt");
        string content = "this is the content of the file.";
        File.WriteAllText(filePath, content);
    }

    private string GetHeadBranchName()
    {
        using var repo = new Repository(_repoDir);
        return repo.Head.FriendlyName;
    }

    private static void EnsureServiceDefaultBranch(Repository repo)
    {
        string currentHeadBranch = repo.Head.FriendlyName;
        if (currentHeadBranch == General.DefaultBranch)
        {
            return;
        }

        Branch defaultBranch = repo.CreateBranch(General.DefaultBranch, repo.Head.Tip);
        Commands.Checkout(repo, defaultBranch);
        repo.Branches.Remove(currentHeadBranch);
    }

    private void TrackDirectory(string directory) => _extraDirsToCleanUp.Add(directory);

    public void Dispose()
    {
        try
        {
            foreach (string directory in _extraDirsToCleanUp.Append(_repoDir))
            {
                if (!string.IsNullOrWhiteSpace(directory) && Directory.Exists(directory))
                {
                    Directory.Delete(directory, true);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to clean up test directory: {ex.Message}");
        }
    }
}
