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

        // Create the service under test
        _sourceControlService = new SourceControlService(
            _settings,
            _giteaClientMock.Object,
            new Mock<IGitServerAuthHeadersProvider>().Object
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

    public void Dispose()
    {
        if (string.IsNullOrWhiteSpace(_repoDir))
        {
            return;
        }
        try
        {
            if (Directory.Exists(_repoDir))
            {
                Directory.Delete(_repoDir, true);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to clean up test directory: {ex.Message}");
        }
    }
}
