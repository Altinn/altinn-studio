using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
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
        private const string VersionPrefix = "/designer/api/repos";

        private readonly Mock<ISourceControl> _sourceControlMock = new();
        private readonly Mock<IHubContext<SyncHub, ISyncClient>> _syncHubContextMock = new();
        private readonly Mock<IHubClients<ISyncClient>> _hubClientsMock = new();
        private readonly Mock<ISyncClient> _syncClientMock = new();

        public CommitAndPushRepoTests(WebApplicationFactory<Program> factory)
            : base(factory) { }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            base.ConfigureTestServices(services);
            services.Configure<ServiceRepositorySettings>(c => c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGiteaClient, IGiteaClientMock>();

            _hubClientsMock.Setup(x => x.Group("testUser")).Returns(_syncClientMock.Object);
            _syncHubContextMock.Setup(x => x.Clients).Returns(_hubClientsMock.Object);

            services.AddSingleton(_sourceControlMock.Object);
            services.AddSingleton(_syncHubContextMock.Object);
        }

        [Fact]
        public async Task CommitAndPushRepo_WhenRebaseRecoverySucceeds_EmitsSyncEventsFromRebaseResult()
        {
            string org = "ttd";
            string repo = "apps-test";
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/commit-and-push";

            _sourceControlMock
                .Setup(x =>
                    x.PushChangesForRepository(
                        It.Is<AltinnAuthenticatedRepoEditingContext>(ctx =>
                            ctx.Org == org
                            && ctx.Repo == repo
                            && ctx.Developer == "testUser"
                            && ctx.DeveloperAppToken == "test-access-token-for-git-operations"
                        ),
                        It.IsAny<CommitInfo>()
                    )
                )
                .Throws(new LibGit2Sharp.NonFastForwardException("remote advanced"));
            _sourceControlMock
                .Setup(x =>
                    x.GetCurrentBranch(
                        It.Is<AltinnAuthenticatedRepoEditingContext>(ctx =>
                            ctx.Org == org
                            && ctx.Repo == repo
                            && ctx.Developer == "testUser"
                            && ctx.DeveloperAppToken == "test-access-token-for-git-operations"
                        )
                    )
                )
                .Returns(new CurrentBranchInfo { BranchName = "master" });
            _sourceControlMock
                .Setup(x =>
                    x.RebaseOntoRemoteBranch(
                        It.Is<AltinnAuthenticatedRepoEditingContext>(ctx =>
                            ctx.Org == org
                            && ctx.Repo == repo
                            && ctx.Developer == "testUser"
                            && ctx.DeveloperAppToken == "test-access-token-for-git-operations"
                        ),
                        "master"
                    )
                )
                .Returns(
                    new RemoteRebaseResult
                    {
                        Status = LibGit2Sharp.RebaseStatus.Complete,
                        ContentStatus =
                        [
                            new RepositoryContent { FilePath = "App/config/applicationmetadata.json" },
                            new RepositoryContent { FilePath = "App/ui/layouts/default.json" },
                        ],
                    }
                );

            using var requestContent = new StringContent(
                """
                {
                  "message": "test commit",
                  "org": "ttd",
                  "repository": "apps-test"
                }
                """,
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            );

            using HttpResponseMessage response = await HttpClient.PostAsync(uri, requestContent);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            _sourceControlMock.Verify(
                x =>
                    x.PublishBranch(
                        It.Is<AltinnAuthenticatedRepoEditingContext>(ctx =>
                            ctx.Org == org
                            && ctx.Repo == repo
                            && ctx.Developer == "testUser"
                            && ctx.DeveloperAppToken == "test-access-token-for-git-operations"
                        ),
                        "master"
                    ),
                Times.Once
            );
            _syncClientMock.Verify(
                x =>
                    x.FileSyncSuccess(
                        new SyncSuccess(new Source("applicationmetadata.json", "App/config/applicationmetadata.json"))
                    ),
                Times.Once
            );
            _syncClientMock.Verify(
                x => x.FileSyncSuccess(new SyncSuccess(new Source("default.json", "App/ui/layouts/default.json"))),
                Times.Once
            );
            _sourceControlMock.Verify(x => x.RepositoryStatus(It.IsAny<AltinnRepoEditingContext>()), Times.Never);
        }
    }
}
