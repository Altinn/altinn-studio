using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Medallion.Threading;
using Moq;
using Xunit;

namespace Designer.Tests.Services.GitOps.GitRepoGitOpsConfigurationManagerTests;

public class LockLocalRepositoryTests : GitRepoGitOpsConfigurationManagerTestsBase<LockLocalRepositoryTests>
{
    [Fact]
    public async Task LockLocalRepository_TakesTheLockTheRepositoryCleanupTakesForTheClone()
    {
        IDistributedSynchronizationHandle handle = Mock.Of<IDistributedSynchronizationHandle>();
        MockLockService
            .Setup(service =>
                service.AcquireRepoUserWideLockAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<TimeSpan?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(handle);

        IAsyncDisposable gitOpsLock = await GitOpsConfigurationManager.LockLocalRepositoryAsync(OrgEditingContext);

        Assert.Same(handle, gitOpsLock);
        MockLockService.Verify(service =>
            service.AcquireRepoUserWideLockAsync(
                AltinnRepoEditingContext.FromOrgRepoDeveloper(
                    OrgEditingContext.Org,
                    TestRepoName,
                    OrgEditingContext.Developer
                ),
                It.IsNotNull<TimeSpan?>(),
                It.IsAny<CancellationToken>()
            )
        );
    }
}
