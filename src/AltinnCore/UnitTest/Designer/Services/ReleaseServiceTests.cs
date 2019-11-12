using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.Repository;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.Services;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Enums;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace AltinnCore.UnitTest.Designer.Services
{
    /// <summary>
    /// Tests for ReleaseService
    /// </summary>
    public class ReleaseServiceTests
    {
        private readonly ReleaseService _sut;
        private readonly Mock<ReleaseRepository> _releaseDbRepoMock;
        private readonly Mock<IAzureDevOpsBuildService> _azureDevOpsBuildServiceMock;
        private readonly Mock<ISourceControl> _sourceControlMock;
        private readonly Mock<IGitea> _giteaWrapperMock;

        /// <summary>
        /// Initialize for the tests
        /// </summary>
        public ReleaseServiceTests()
        {
            _releaseDbRepoMock = new Mock<ReleaseRepository>();
            _azureDevOpsBuildServiceMock = new Mock<IAzureDevOpsBuildService>();
            _sourceControlMock = new Mock<ISourceControl>();
            _giteaWrapperMock = new Mock<IGitea>();

            Mock<IHttpContextAccessor> httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            DefaultHttpContext context = new DefaultHttpContext();
            httpContextAccessorMock.Setup(_ => _.HttpContext).Returns(context);
            AzureDevOpsSettings azureDevOpsSettings = new AzureDevOpsSettings();
            Mock<IOptionsMonitor<AzureDevOpsSettings>> optionsMonitorMock = new Mock<IOptionsMonitor<AzureDevOpsSettings>>();
            optionsMonitorMock.Setup(x => x.CurrentValue).Returns(azureDevOpsSettings);

            _sut = new ReleaseService(
                _releaseDbRepoMock.Object,
                httpContextAccessorMock.Object,
                _azureDevOpsBuildServiceMock.Object,
                optionsMonitorMock.Object);
        }

        /// <summary>
        /// x
        /// </summary>
        /// <returns></returns>
        [Fact(Skip = "Test is not ready to be run")]
        public async Task CreateAsync_NotStarted_CreatedRelease()
        {
            ReleaseEntity releaseToReturn = CreateReleaseEntity(BuildStatus.NotStarted, BuildResult.None);
            _releaseDbRepoMock.Setup(x => x.GetWithSqlAsync<ReleaseEntity>(It.IsAny<SqlQuerySpec>()))
                .ReturnsAsync(new List<ReleaseEntity> { releaseToReturn });

            ReleaseEntity releaseEntity = new ReleaseEntity
            {
                TagName = releaseToReturn.TagName,
                App = releaseToReturn.App,
                Org = releaseToReturn.Org,
            };
            await _sut.CreateAsync(releaseEntity);

            _azureDevOpsBuildServiceMock.Verify(
                x => x.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>()),
                Times.Never);
            _releaseDbRepoMock.Verify(
                x => x.CreateAsync(It.IsAny<ReleaseEntity>()),
                Times.Never);
        }

        private static ReleaseEntity CreateReleaseEntity(BuildStatus buildStatus, BuildResult buildResult)
        {
            return new ReleaseEntity
            {
                App = "foo",
                Org = "bar",
                TagName = "foobar",
                Build = new BuildEntity
                {
                    Status = buildStatus,
                    Result = buildResult
                }
            };
        }
    }
}
