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
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;
using DesignerRepositoryStatus = Altinn.Studio.Designer.Enums.RepositoryStatus;

namespace Designer.Tests.Services
{
    public class SourceControlServiceTest
    {
        [Fact]
        public void DeleteLocalBranchIfExists()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            string branchName = "feature-branch-to-delete";
            AltinnRepoEditingContext context = fixture.CreateTestRepository(repoName, branchName);

            using (Repository repo = new(fixture.RepoDir))
            {
                Assert.Contains(repo.Branches, b => b.FriendlyName == branchName);
            }

            fixture.Service.DeleteLocalBranchIfExists(context, branchName);

            using Repository finalRepoState = new(fixture.RepoDir);
            Assert.NotNull(finalRepoState);
            Assert.NotEmpty(finalRepoState.Branches);
            Assert.DoesNotContain(finalRepoState.Branches, b => b.FriendlyName == branchName);
        }

        [Fact]
        public void CreateLocalBranch()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            string branchName = "new-feature-branch";
            string commitSha = null;
            AltinnRepoEditingContext context = fixture.CreateTestRepository(repoName);

            fixture.Service.CreateLocalBranch(context, branchName, commitSha);

            using Repository finalRepoState = new(fixture.RepoDir);
            Assert.NotNull(finalRepoState);
            Assert.NotEmpty(finalRepoState.Branches);
            Assert.Equal(2, finalRepoState.Branches.Count());
            Assert.Contains(finalRepoState.Branches, b => b.FriendlyName == branchName);
        }

        [Fact]
        public void CreateLocalBranch_WithCommitSha()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            string branchName = "new-feature-branch";
            AltinnRepoEditingContext context = fixture.CreateTestRepository(repoName);
            string defaultBranchName = fixture.GetHeadBranchName();
            string commitSha;
            using (Repository repo = new(fixture.RepoDir))
            {
                commitSha = repo.Head.Tip.Sha;
            }

            fixture.AddFileToRepo();
            fixture.Service.CommitToLocalRepo(context, "commitMessage");
            fixture.Service.CreateLocalBranch(context, branchName, commitSha);

            using Repository finalRepoState = new(fixture.RepoDir);
            Assert.NotNull(finalRepoState);
            Assert.NotEmpty(finalRepoState.Branches);
            Assert.Equal(2, finalRepoState.Branches.Count());
            Branch createdBranch = finalRepoState.Branches.Single(b => b.FriendlyName == branchName);
            Assert.NotNull(createdBranch);
            Assert.Equal(commitSha, createdBranch.Tip.Sha);
            Branch defaultBranch = finalRepoState.Branches.Single(b => b.FriendlyName == defaultBranchName);
            Assert.Equal("commitMessage", defaultBranch.Tip.MessageShort);
        }

        [Fact]
        public void CommitToLocalRepo()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            string commitMessage = "fixed everything!";
            AltinnRepoEditingContext context = fixture.CreateTestRepository(repoName);

            fixture.AddFileToRepo();
            fixture.Service.CommitToLocalRepo(context, commitMessage);

            using Repository finalRepoState = new(fixture.RepoDir);
            Assert.NotNull(finalRepoState);
            Assert.NotEmpty(finalRepoState.Commits);
            Assert.Equal(2, finalRepoState.Commits.Count());
            Assert.Equal(commitMessage, finalRepoState.Head.Tip.MessageShort);
        }

        [Fact]
        public void CheckoutRepoOnBranch()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnRepoEditingContext context = fixture.CreateTestRepository(repoName);
            string branchName = "new-feature-branch";

            fixture.Service.CreateLocalBranch(context, branchName);
            fixture.Service.CheckoutRepoOnBranch(context, branchName);

            using Repository repository = new(fixture.RepoDir);
            Assert.Equal(2, repository.Branches.Count());
            Assert.Equal(branchName, repository.Head.FriendlyName);
        }

        [Fact]
        public void RebaseOntoDefaultBranch()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnRepoEditingContext context = fixture.CreateTestRepository(repoName);
            string defaultBranchName = fixture.GetHeadBranchName();
            string branchName = "new-feature-branch";
            string commitMessageFeature = "broke it again!";
            string commitMessageMaster = "fixed everything!";

            fixture.Service.CreateLocalBranch(context, branchName);
            fixture.Service.CheckoutRepoOnBranch(context, branchName);
            fixture.AddFileToRepo("file-on-feature-branch");
            fixture.Service.CommitToLocalRepo(context, commitMessageFeature);

            fixture.Service.CheckoutRepoOnBranch(context, defaultBranchName);
            fixture.AddFileToRepo("file-on-master");
            fixture.Service.CommitToLocalRepo(context, commitMessageMaster);

            fixture.Service.CheckoutRepoOnBranch(context, branchName);
            fixture.Service.RebaseOntoDefaultBranch(context);

            using Repository repository = new(fixture.RepoDir);
            Assert.Equal(2, repository.Branches.Count());
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
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnRepoEditingContext context = fixture.CreateTestRepository(repoName);
            string defaultBranchName = fixture.GetHeadBranchName();
            string branchName = "new-feature-branch";
            string commitMessage = "broke it again!";

            fixture.Service.CreateLocalBranch(context, branchName);
            fixture.Service.CheckoutRepoOnBranch(context, branchName);
            fixture.AddFileToRepo("file-on-feature-branch");
            fixture.Service.CommitToLocalRepo(context, commitMessage);

            fixture.Service.CheckoutRepoOnBranch(context, defaultBranchName);
            fixture.Service.MergeBranchIntoHead(context, branchName);

            using Repository repository = new(fixture.RepoDir);
            Branch defaultBranch = repository.Branches.First(b => b.FriendlyName == defaultBranchName);
            Assert.Equal(2, defaultBranch.Commits.Count());
            Assert.Equal(commitMessage, defaultBranch.Tip.MessageShort);
        }

        [Fact]
        public async Task DeleteRepository_GiteaServiceIsCalled()
        {
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

            using var fixture = Fixture.Create(developer: developer, giteaClientMock: mock);

            await fixture.Service.DeleteRepository(editingContext);
            string expectedPath = TestDataHelper.GetTestDataRepositoryDirectory(org, app, developer);

            mock.VerifyAll();
            Assert.False(Directory.Exists(expectedPath));
        }

        [Fact]
        public async Task CreatePullRequest_InputMappedCorectlyToCreatePullRequestOption()
        {
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

            using var fixture = Fixture.Create(developer: user, giteaClientMock: mock);

            await fixture.Service.CreatePullRequest(editingContext, target, source, "title");

            mock.VerifyAll();
        }

        [Fact]
        public void GetChangedContent_OnMasterBranch_ReturnsUncommittedChanges()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnAuthenticatedRepoEditingContext authenticatedContext =
                AltinnAuthenticatedRepoEditingContext.FromEditingContext(
                    fixture.CreateTestRepository(repoName),
                    "dummytoken"
                );

            string testFile = Path.Join(fixture.RepoDir, "uncommitted-file.txt");
            File.WriteAllText(testFile, "This is new content");

            var result = fixture.Service.GetChangedContent(authenticatedContext);

            Assert.Single(result);
            Assert.Contains("uncommitted-file.txt", result.Keys);
        }

        [Fact]
        public void GetChangedContent_OnFeatureBranch_ReturnsOnlyUncommittedChanges()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            const string BranchName = "feature-branch";
            AltinnRepoEditingContext context = fixture.CreateTestRepository(repoName);
            AltinnAuthenticatedRepoEditingContext authenticatedContext =
                AltinnAuthenticatedRepoEditingContext.FromEditingContext(context, "dummytoken");

            fixture.Service.CreateLocalBranch(context, BranchName);
            fixture.Service.CheckoutRepoOnBranch(context, BranchName);

            string committedFile = Path.Join(fixture.RepoDir, "committed-on-feature.txt");
            File.WriteAllText(committedFile, "Committed content");

            using (var repo = new Repository(fixture.RepoDir))
            {
                Commands.Stage(repo, "committed-on-feature.txt");
                var signature = new LibGit2Sharp.Signature(
                    fixture.Developer,
                    $"{fixture.Developer}@test.com",
                    DateTimeOffset.Now
                );
                repo.Commit("Add file on feature branch", signature, signature);
            }

            string uncommittedFile = Path.Join(fixture.RepoDir, "uncommitted-on-feature.txt");
            File.WriteAllText(uncommittedFile, "Uncommitted content");

            var result = fixture.Service.GetChangedContent(authenticatedContext);

            Assert.Single(result);
            Assert.Contains("uncommitted-on-feature.txt", result.Keys);
            Assert.DoesNotContain("committed-on-feature.txt", result.Keys);
        }

        [Fact]
        public void GetChangedContent_NoChanges_ReturnsEmptyDictionary()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnAuthenticatedRepoEditingContext authenticatedContext =
                AltinnAuthenticatedRepoEditingContext.FromEditingContext(
                    fixture.CreateTestRepository(repoName),
                    "dummytoken"
                );

            var result = fixture.Service.GetChangedContent(authenticatedContext);

            Assert.Empty(result);
        }

        [Fact]
        public void PullRemoteChanges_DirtyAndOnlyBehind_FastForwardsWithoutLosingLocalChanges()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = fixture.CreateTrackedRepositoryForPull(
                repoName,
                out string localRepoPath,
                out string collaboratorRepoPath
            );

            fixture.CommitAndPushChange(collaboratorRepoPath, "remote-only.txt", "remote content", "remote update");
            File.WriteAllText(Path.Join(localRepoPath, "local-only.txt"), "local dirty content");

            RepoStatus status = fixture.Service.PullRemoteChanges(authenticatedContext);

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
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = fixture.CreateTrackedRepositoryForPull(
                repoName,
                out string localRepoPath,
                out string collaboratorRepoPath
            );

            using Repository repoBeforePull = new(localRepoPath);
            string headBeforePull = repoBeforePull.Head.Tip.Sha;

            fixture.CommitAndPushChange(
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

            RepoStatus status = fixture.Service.PullRemoteChanges(authenticatedContext);

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
        public void PullRemoteChanges_DirtyAndDiverged_ReturnsCheckoutConflictWithoutRebasing()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = fixture.CreateTrackedRepositoryForPull(
                repoName,
                out string localRepoPath,
                out string collaboratorRepoPath
            );
            string headBeforePull;

            using (Repository localRepo = new(localRepoPath))
            {
                File.WriteAllText(Path.Join(localRepoPath, "test.txt"), "local committed change");
                Commands.Stage(localRepo, "test.txt");
                var signature = new LibGit2Sharp.Signature(
                    fixture.Developer,
                    $"{fixture.Developer}@test.com",
                    DateTimeOffset.Now
                );
                localRepo.Commit("local committed update", signature, signature);
                headBeforePull = localRepo.Head.Tip.Sha;
            }

            fixture.CommitAndPushChange(collaboratorRepoPath, "remote-only.txt", "remote content", "remote update");
            File.WriteAllText(Path.Join(localRepoPath, "local-only.txt"), "dirty change");

            RepoStatus status = fixture.Service.PullRemoteChanges(authenticatedContext);

            Assert.Equal(DesignerRepositoryStatus.CheckoutConflict, status.RepositoryStatus);
            using Repository localRepoAfterPull = new(localRepoPath);
            Assert.Equal(headBeforePull, localRepoAfterPull.Head.Tip.Sha);
            Assert.True(localRepoAfterPull.RetrieveStatus(new StatusOptions()).IsDirty);
            Assert.Empty(localRepoAfterPull.Index.Conflicts);
            Assert.False(File.Exists(Path.Join(localRepoPath, "remote-only.txt")));
            Assert.True(File.Exists(Path.Join(localRepoPath, "local-only.txt")));
        }

        [Fact]
        public void PullRemoteChanges_CleanAndDiverged_RebasesWithoutMergeCommit()
        {
            using var fixture = Fixture.Create();

            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = fixture.CreateTrackedRepositoryForPull(
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
                var signature = new LibGit2Sharp.Signature(
                    fixture.Developer,
                    $"{fixture.Developer}@test.com",
                    DateTimeOffset.Now
                );
                localCommitSha = localRepo.Commit("local committed update", signature, signature).Sha;
            }

            string remoteCommitSha = fixture.CommitAndPushChange(
                collaboratorRepoPath,
                "remote-only.txt",
                "remote content",
                "remote update"
            );

            RepoStatus status = fixture.Service.PullRemoteChanges(authenticatedContext);

            Assert.Equal(DesignerRepositoryStatus.Ok, status.RepositoryStatus);
            using Repository localRepoAfterPull = new(localRepoPath);
            Assert.NotEqual(localCommitSha, localRepoAfterPull.Head.Tip.Sha);
            Assert.Single(localRepoAfterPull.Head.Tip.Parents);
            Assert.Equal(remoteCommitSha, localRepoAfterPull.Head.Tip.Parents.Single().Sha);
        }

        [Theory]
        [InlineData(false)]
        [InlineData(true)]
        public void PullRemoteChanges_RepoInitializedFromEmptyRemote_PullsRemoteChanges(bool studioOidcEnabled)
        {
            using var fixture = Fixture.Create(studioOidcEnabled: studioOidcEnabled);

            string repoName = TestDataHelper.GenerateTestRepoName();
            AltinnAuthenticatedRepoEditingContext authenticatedContext = fixture.CreateRepositoryFromEmptyRemote(
                repoName,
                out string localRepoPath,
                out string collaboratorRepoPath
            );

            fixture.CommitAndPushChange(collaboratorRepoPath, "remote-only.txt", "remote content", "remote update");

            RepoStatus status = fixture.Service.PullRemoteChanges(authenticatedContext);

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
            HttpContext context = new DefaultHttpContext();
            context.Request.HttpContext.User = principal;

            return context;
        }

        private static IConfiguration CreateConfiguration(bool studioOidcEnabled)
        {
            return new ConfigurationBuilder()
                .AddInMemoryCollection(
                    new Dictionary<string, string>
                    {
                        [$"FeatureManagement:{StudioFeatureFlags.StudioOidc}"] = studioOidcEnabled.ToString(),
                    }
                )
                .Build();
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

        private sealed record Fixture(
            SourceControlService SourceControlService,
            ServiceRepositorySettings Settings,
            Mock<IGiteaClient> MockGiteaClient,
            Mock<IGitServerAuthHeadersProvider> MockGitServerAuthHeadersProvider,
            string Org,
            string Developer
        ) : IDisposable
        {
            private readonly List<string> _directoriesToCleanUp = [];

            public SourceControlService Service => SourceControlService;

            public string RepoDir { get; private set; } = string.Empty;

            public static Fixture Create(
                bool studioOidcEnabled = false,
                string org = "ttd",
                string developer = "testUser",
                Mock<IGiteaClient> giteaClientMock = null
            )
            {
                Mock<IGiteaClient> mockGiteaClient = giteaClientMock ?? new Mock<IGiteaClient>();
                Mock<IGitServerAuthHeadersProvider> mockGitServerAuthHeadersProvider = new();
                mockGitServerAuthHeadersProvider.Setup(x => x.GetAuthHeaders()).Returns([]);

                ServiceRepositorySettings settings = new()
                {
                    RepositoryLocation = TestDataHelper.GetTestDataRepositoriesRootDirectory(),
                    RepositoryBaseURL = "https://test.gitea.com",
                };

                Mock<IHttpContextAccessor> httpContextAccessorMock = new();
                httpContextAccessorMock.Setup(x => x.HttpContext).Returns(GetHttpContextForTestUser(developer));

                SourceControlService service = new(
                    settings,
                    mockGiteaClient.Object,
                    mockGitServerAuthHeadersProvider.Object,
                    CreateConfiguration(studioOidcEnabled)
                );

                return new Fixture(
                    service,
                    settings,
                    mockGiteaClient,
                    mockGitServerAuthHeadersProvider,
                    org,
                    developer
                );
            }

            public AltinnRepoEditingContext CreateTestRepository(string repoName, string additionalBranch = null)
            {
                AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                    Org,
                    repoName,
                    Developer
                );
                string repoDir = TestDataHelper.GetTestDataRepositoryDirectory(Org, repoName, Developer);
                SetRepoDir(repoDir);
                Directory.CreateDirectory(repoDir);

                Repository.Init(repoDir);

                using var repo = new Repository(repoDir);

                string testFile = Path.Join(repoDir, "test.txt");
                File.WriteAllText(testFile, "Initial content");

                Commands.Stage(repo, "test.txt");
                var signature = new LibGit2Sharp.Signature(Developer, $"{Developer}@test.com", DateTimeOffset.Now);
                repo.Commit("Initial commit", signature, signature);
                EnsureServiceDefaultBranch(repo);

                if (!string.IsNullOrEmpty(additionalBranch))
                {
                    repo.CreateBranch(additionalBranch);
                }

                return editingContext;
            }

            public AltinnAuthenticatedRepoEditingContext CreateTrackedRepositoryForPull(
                string repoName,
                out string localRepoPath,
                out string collaboratorRepoPath
            )
            {
                Settings.RepositoryBaseURL = new Uri(
                    TestDataHelper.GetTestDataRemoteRepositoryRootDirectory() + Path.DirectorySeparatorChar
                ).AbsoluteUri;
                AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                    Org,
                    repoName,
                    Developer
                );

                localRepoPath = TestDataHelper.GetTestDataRepositoryDirectory(Org, repoName, Developer);
                string remoteRepoPath = $"{TestDataHelper.GetTestDataRemoteRepository(Org, repoName)}.git";
                collaboratorRepoPath = $"{remoteRepoPath}-collaborator";
                string seedRepoPath = $"{remoteRepoPath}-seed";

                SetRepoDir(localRepoPath);
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
                    var signature = new LibGit2Sharp.Signature(Developer, $"{Developer}@test.com", DateTimeOffset.Now);
                    seedRepo.Commit("Initial commit", signature, signature);
                    EnsureServiceDefaultBranch(seedRepo);
                }

                Repository.Init(remoteRepoPath, true);
                using (Repository seedRepo = new(seedRepoPath))
                {
                    Remote remote = seedRepo.Network.Remotes.Add("origin", remoteRepoPath);
                    seedRepo.Network.Push(remote, $"refs/heads/{General.DefaultBranch}", new PushOptions());
                }

                Repository.Clone(
                    remoteRepoPath,
                    localRepoPath,
                    new CloneOptions { BranchName = General.DefaultBranch }
                );
                Repository.Clone(
                    remoteRepoPath,
                    collaboratorRepoPath,
                    new CloneOptions { BranchName = General.DefaultBranch }
                );

                return AltinnAuthenticatedRepoEditingContext.FromEditingContext(editingContext, "dummytoken");
            }

            public AltinnAuthenticatedRepoEditingContext CreateRepositoryFromEmptyRemote(
                string repoName,
                out string localRepoPath,
                out string collaboratorRepoPath
            )
            {
                Settings.RepositoryBaseURL = new Uri(
                    TestDataHelper.GetTestDataRemoteRepositoryRootDirectory() + Path.DirectorySeparatorChar
                ).AbsoluteUri;
                AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                    Org,
                    repoName,
                    Developer
                );

                localRepoPath = TestDataHelper.GetTestDataRepositoryDirectory(Org, repoName, Developer);
                string remoteRepoPath = $"{TestDataHelper.GetTestDataRemoteRepository(Org, repoName)}.git";
                collaboratorRepoPath = $"{remoteRepoPath}-collaborator";

                SetRepoDir(localRepoPath);
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
                Service.PushChangesForRepository(authenticatedContext, new CommitInfo { Message = "initial commit" });

                Repository.Clone(remoteRepoPath, collaboratorRepoPath);
                return authenticatedContext;
            }

            public string CommitAndPushChange(
                string collaboratorRepoPath,
                string filePath,
                string content,
                string commitMessage
            )
            {
                using var collaboratorRepo = new Repository(collaboratorRepoPath);
                File.WriteAllText(Path.Join(collaboratorRepoPath, filePath), content);
                Commands.Stage(collaboratorRepo, filePath);
                var signature = new LibGit2Sharp.Signature(Developer, $"{Developer}@test.com", DateTimeOffset.Now);
                LibGit2Sharp.Commit commit = collaboratorRepo.Commit(commitMessage, signature, signature);
                collaboratorRepo.Network.Push(collaboratorRepo.Head, new PushOptions());
                return commit.Sha;
            }

            public void AddFileToRepo(string filename = null)
            {
                string filePath = Path.Join(RepoDir, filename ?? "new-file.txt");
                string content = "this is the content of the file.";
                File.WriteAllText(filePath, content);
            }

            public string GetHeadBranchName()
            {
                using var repo = new Repository(RepoDir);
                return repo.Head.FriendlyName;
            }

            public void Dispose()
            {
                try
                {
                    TrackDirectory(RepoDir);
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

            private void SetRepoDir(string repoDir)
            {
                RepoDir = repoDir;
                TrackDirectory(repoDir);
            }

            private void TrackDirectory(string directory)
            {
                if (!string.IsNullOrWhiteSpace(directory))
                {
                    _directoriesToCleanUp.Add(directory);
                }
            }
        }
    }
}
