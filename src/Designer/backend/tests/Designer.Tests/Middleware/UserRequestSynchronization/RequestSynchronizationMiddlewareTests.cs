using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace Designer.Tests.Middleware.UserRequestSynchronization;

public class RequestSynchronizationMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_TracksResolvedRepositoryActivity()
    {
        var httpContext = new DefaultHttpContext();
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "test-app", "test-user");
        var repositoryContextResolver = new Mock<IRequestContextResolver<AltinnRepoEditingContext>>();
        repositoryContextResolver
            .Setup(instance => instance.TryResolveContext(httpContext, out editingContext))
            .Returns(true);
        var repositoryActivityService = new Mock<IRepositoryActivityService>();
        bool nextCalled = false;
        var middleware = new RequestSynchronizationMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(
            httpContext,
            new Mock<IRequestSyncEvaluator<AltinnRepoEditingContext>>().Object,
            new Mock<IRequestSyncEvaluator<AltinnOrgContext>>().Object,
            repositoryContextResolver.Object,
            new Mock<ILockService>().Object,
            repositoryActivityService.Object
        );

        Assert.True(nextCalled);
        repositoryActivityService.Verify(
            instance => instance.MarkActiveAsync(editingContext, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }
}
