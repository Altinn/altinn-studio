using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class CommitAndPushRepoTests
        : DesignerEndpointsTestsBase<CommitAndPushRepoTests>,
            IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix => "/designer/api/repos";
        private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);
        private readonly Mock<ISourceControl> _sourceControlMock = new();
        private readonly Mock<IHubContext<SyncHub, ISyncClient>> _syncHubMock = new();
        private readonly Mock<IHubClients<ISyncClient>> _hubClientsMock = new();
        private readonly Mock<ISyncClient> _syncClientMock = new();

        public CommitAndPushRepoTests(WebApplicationFactory<Program> factory)
            : base(factory)
        {
            _hubClientsMock.Setup(clients => clients.Group(It.IsAny<string>())).Returns(_syncClientMock.Object);
            _syncHubMock.Setup(hub => hub.Clients).Returns(_hubClientsMock.Object);
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            base.ConfigureTestServices(services);
            services.AddSingleton(_sourceControlMock.Object);
            services.AddSingleton(_syncHubMock.Object);
        }

        [Fact]
        public async Task CommitAndPushRepo_NonFastForwardRebaseSuccess_EmitsSyncForChangedFiles()
        {
            // Arrange
            const string org = "ttd";
            const string repo = "apps-test";
            const string branchName = "feature/rebase-notify";
            const string commitShaBeforeRebase = "abc123";
            const string commitShaAfterRebase = "def456";
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/commit-and-push";
            CommitInfo commitInfo = new()
            {
                Org = org,
                Repository = repo,
                Message = "Commit changes",
                BranchName = branchName,
            };
            List<string> changedFiles = ["App/config/applicationmetadata.json", "App/models/form.json"];

            _sourceControlMock
                .Setup(sourceControl =>
                    sourceControl.PushChangesForRepository(
                        It.IsAny<AltinnAuthenticatedRepoEditingContext>(),
                        It.Is<CommitInfo>(c =>
                            c.Org == commitInfo.Org
                            && c.Repository == commitInfo.Repository
                            && c.Message == commitInfo.Message
                            && c.BranchName == commitInfo.BranchName
                        )
                    )
                )
                .Throws(new LibGit2Sharp.NonFastForwardException("Non-fast-forward"));
            _sourceControlMock
                .SetupSequence(sourceControl => sourceControl.GetCurrentBranch(It.IsAny<AltinnRepoEditingContext>()))
                .Returns(new CurrentBranchInfo { BranchName = branchName, CommitSha = commitShaBeforeRebase })
                .Returns(new CurrentBranchInfo { BranchName = branchName, CommitSha = commitShaAfterRebase });
            _sourceControlMock
                .Setup(sourceControl =>
                    sourceControl.RebaseOntoRemoteBranch(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), branchName)
                )
                .Returns((LibGit2Sharp.RebaseResult)null);
            _sourceControlMock
                .Setup(sourceControl =>
                    sourceControl.GetChangedFilesBetweenCommits(
                        It.IsAny<AltinnRepoEditingContext>(),
                        commitShaBeforeRebase,
                        commitShaAfterRebase
                    )
                )
                .Returns(changedFiles);

            using var content = new StringContent(
                JsonSerializer.Serialize(commitInfo, _jsonSerializerOptions),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            );

            // Act
            using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            _sourceControlMock.Verify(
                sourceControl =>
                    sourceControl.PublishBranch(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), branchName),
                Times.Once
            );
            _sourceControlMock.Verify(
                sourceControl =>
                    sourceControl.GetChangedFilesBetweenCommits(
                        It.IsAny<AltinnRepoEditingContext>(),
                        commitShaBeforeRebase,
                        commitShaAfterRebase
                    ),
                Times.Once
            );
            _syncClientMock.Verify(
                client =>
                    client.FileSyncSuccess(
                        It.Is<SyncSuccess>(syncSuccess =>
                            syncSuccess.Source.Path == "App/config/applicationmetadata.json"
                        )
                    ),
                Times.Once
            );
            _syncClientMock.Verify(
                client =>
                    client.FileSyncSuccess(
                        It.Is<SyncSuccess>(syncSuccess => syncSuccess.Source.Path == "App/models/form.json")
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task CommitAndPushRepo_PushSucceeds_DoesNotAttemptRebaseRecovery()
        {
            // Arrange
            const string org = "ttd";
            const string repo = "apps-test";
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/commit-and-push";
            CommitInfo commitInfo = new()
            {
                Org = org,
                Repository = repo,
                Message = "Commit changes",
                BranchName = "main",
            };

            using var content = new StringContent(
                JsonSerializer.Serialize(commitInfo, _jsonSerializerOptions),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            );

            // Act
            using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            _sourceControlMock.Verify(
                sourceControl =>
                    sourceControl.RebaseOntoRemoteBranch(
                        It.IsAny<AltinnAuthenticatedRepoEditingContext>(),
                        It.IsAny<string>()
                    ),
                Times.Never
            );
            _sourceControlMock.Verify(
                sourceControl =>
                    sourceControl.PublishBranch(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), It.IsAny<string>()),
                Times.Never
            );
            _sourceControlMock.Verify(
                sourceControl =>
                    sourceControl.GetChangedFilesBetweenCommits(
                        It.IsAny<AltinnRepoEditingContext>(),
                        It.IsAny<string>(),
                        It.IsAny<string>()
                    ),
                Times.Never
            );
            _syncClientMock.Verify(client => client.FileSyncSuccess(It.IsAny<SyncSuccess>()), Times.Never);
        }
    }
}
