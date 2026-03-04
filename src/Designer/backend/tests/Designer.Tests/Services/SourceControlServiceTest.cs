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
using Designer.Tests.Utils;
using LibGit2Sharp;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using DesignerRepositoryStatus = Altinn.Studio.Designer.Enums.RepositoryStatus;

namespace Designer.Tests.Services
{
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
        private readonly List<string> _directoriesToCleanUp = [];

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
            _sourceControlService = new SourceControlService(_settings, _giteaClientMock.Object);
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
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                org,
                app,
                developer
            );

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
        public void PullRemoteChanges_CheckoutConflict_AutoStashAppliesAndPullsWhenNoConflict()
        {
            // Arrange
            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
                repoName,
                out string localRepoPath,
                out string collaboratorRepoPath
            );
            const string trackedFilePath = "test.txt";

            CommitAndPushChange(
                collaboratorRepoPath,
                trackedFilePath,
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
                remote line eleven
                line twelve
                """,
                "remote update"
            );
            File.WriteAllText(
                Path.Join(localRepoPath, trackedFilePath),
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

            // Act
            RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

            // Assert
            Assert.Equal(DesignerRepositoryStatus.Ok, status.RepositoryStatus);
            string pulledFile = File.ReadAllText(Path.Join(localRepoPath, trackedFilePath));
            Assert.Contains("local line two", pulledFile);
            Assert.Contains("remote line eleven", pulledFile);
            using Repository localRepo = new(localRepoPath);
            Assert.True(localRepo.RetrieveStatus(new StatusOptions()).IsDirty);
            Assert.Empty(localRepo.Index.Conflicts);
            Assert.Empty(localRepo.Stashes);
        }

        [Fact]
        public void PullRemoteChanges_CheckoutConflict_AutoStashRollsBackWhenApplyConflicts()
        {
            // Arrange
            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = CreateTrackedRepositoryForPull(
                repoName,
                out string localRepoPath,
                out string collaboratorRepoPath
            );
            const string trackedFilePath = "test.txt";

            using Repository repoBeforePull = new(localRepoPath);
            string headBeforePull = repoBeforePull.Head.Tip.Sha;

            CommitAndPushChange(
                collaboratorRepoPath,
                trackedFilePath,
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
                Path.Join(localRepoPath, trackedFilePath),
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

            // Act
            RepoStatus status = _sourceControlService.PullRemoteChanges(authenticatedContext);

            // Assert
            Assert.Equal(DesignerRepositoryStatus.CheckoutConflict, status.RepositoryStatus);
            using Repository localRepo = new(localRepoPath);
            Assert.Equal(headBeforePull, localRepo.Head.Tip.Sha);
            Assert.True(localRepo.RetrieveStatus(new StatusOptions()).IsDirty);
            Assert.Empty(localRepo.Index.Conflicts);
            Assert.Empty(localRepo.Stashes);
            string pulledFile = File.ReadAllText(Path.Join(localRepoPath, trackedFilePath));
            Assert.Contains("local line two", pulledFile);
            Assert.DoesNotContain("remote line two", pulledFile);
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
                    Path.Join(unitTestFolder, "..", "..", "..", "_TestData", "Repositories")
                    + Path.DirectorySeparatorChar,
            };

            SourceControlService service = new(repoSettings, giteaMock.Object);

            return service;
        }

        private AltinnAuthenticatedRepoEditingContext CreateTrackedRepositoryForPull(
            string repoName,
            out string localRepoPath,
            out string collaboratorRepoPath
        )
        {
            Setup();
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
            _directoriesToCleanUp.Add(localRepoPath);
            _directoriesToCleanUp.Add(remoteRepoPath);
            _directoriesToCleanUp.Add(collaboratorRepoPath);
            _directoriesToCleanUp.Add(seedRepoPath);

            Directory.CreateDirectory(Path.GetDirectoryName(remoteRepoPath)!);
            Directory.CreateDirectory(Path.GetDirectoryName(localRepoPath)!);
            Directory.CreateDirectory(Path.GetDirectoryName(collaboratorRepoPath)!);

            Repository.Init(seedRepoPath);
            using (Repository seedRepo = new(seedRepoPath))
            {
                string filePath = Path.Join(seedRepoPath, "test.txt");
                File.WriteAllText(
                    filePath,
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
            Repository.Clone(
                remoteRepoPath,
                collaboratorRepoPath,
                new CloneOptions { BranchName = General.DefaultBranch }
            );

            return AltinnAuthenticatedRepoEditingContext.FromEditingContext(editingContext, "dummytoken");
        }

        private void CommitAndPushChange(
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
            collaboratorRepo.Commit(commitMessage, signature, signature);
            collaboratorRepo.Network.Push(collaboratorRepo.Head, new PushOptions());
        }

        private AltinnRepoEditingContext CreateTestRepository(string repoName, string additionalBranch = null)
        {
            Setup();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, repoName, _developer);
            _repoDir = TestDataHelper.GetTestDataRepositoryDirectory(_org, repoName, _developer);
            _directoriesToCleanUp.Add(_repoDir);
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
            try
            {
                if (!string.IsNullOrWhiteSpace(_repoDir))
                {
                    _directoriesToCleanUp.Add(_repoDir);
                }

                foreach (string directory in _directoriesToCleanUp.Distinct())
                {
                    if (Directory.Exists(directory))
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
}
