using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Extensions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.OrgWide;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Medallion.Threading;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Middleware.UserRequestSynchronization;

public sealed class RequestSynchronizationMiddlewareTests : IDisposable
{
    private readonly string _repositoriesRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
    private readonly AltinnRepoEditingContext _editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
        "ttd",
        "process-app",
        "testUser"
    );
    private readonly Mock<IAppVersionService> _appVersionService = new();
    private readonly Mock<ILockService> _lockService = new();
    private readonly ServiceProvider _services;
    private int _locksAcquired;
    private bool _lockHeld;

    public RequestSynchronizationMiddlewareTests()
    {
        var repositoryFactory = new AltinnGitRepositoryFactory(_repositoriesRoot);
        Directory.CreateDirectory(
            repositoryFactory.GetRepositoryPath(_editingContext.Org, _editingContext.Repo, _editingContext.Developer)
        );
        var handle = new Mock<IDistributedSynchronizationHandle>();
        handle
            .Setup(value => value.DisposeAsync())
            .Returns(() =>
            {
                _lockHeld = false;
                return ValueTask.CompletedTask;
            });
        _lockService
            .Setup(service =>
                service.AcquireRepoUserWideLockAsync(
                    _editingContext,
                    It.IsAny<TimeSpan?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(() =>
            {
                _locksAcquired++;
                _lockHeld = true;
                return new ValueTask<IDistributedSynchronizationHandle>(handle.Object);
            });

        var services = new ServiceCollection();
        services.RegisterSynchronizationServices(new ConfigurationBuilder().Build());
        services.AddTransient<IAltinnGitRepositoryFactory>(_ => repositoryFactory);
        services.AddTransient(_ => _appVersionService.Object);
        _services = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true, ValidateOnBuild = true }
        );
    }

    [Theory]
    [InlineData(typeof(IRepoUserSyncEligibilityEvaluator))]
    [InlineData(typeof(IOrgWideSyncEligibilityEvaluator))]
    public void RegisterSynchronizationServices_RegistersEveryEvaluator(Type evaluatorType)
    {
        Type[] implementations = typeof(RequestSynchronizationMiddleware)
            .Assembly.GetTypes()
            .Where(type => type.IsClass && !type.IsAbstract && evaluatorType.IsAssignableFrom(type))
            .ToArray();
        var services = new ServiceCollection();

        services.RegisterSynchronizationServices(new ConfigurationBuilder().Build());

        Assert.NotEmpty(implementations);
        Assert.All(
            implementations,
            implementation =>
                Assert.Contains(
                    services,
                    descriptor =>
                        descriptor.ServiceType == evaluatorType
                        && descriptor.ImplementationType == implementation
                        && descriptor.Lifetime == ServiceLifetime.Singleton
                )
        );
    }

    [Theory]
    [InlineData(true, true)]
    [InlineData(false, false)]
    public async Task MetadataWrite_UsesTheRepositoryLockOnlyForV9Apps(bool isV9App, bool locked)
    {
        _appVersionService.Setup(service => service.IsV9App(_editingContext)).Returns(isV9App);

        bool lockedDuringRequest = await Invoke(
            nameof(ApplicationMetadataController),
            nameof(ApplicationMetadataController.UpdateApplicationMetadata),
            "PUT"
        );

        Assert.Equal(locked, lockedDuringRequest);
        Assert.Equal(locked ? 1 : 0, _locksAcquired);
        Assert.False(_lockHeld);
    }

    [Fact]
    public async Task MetadataRead_DoesNotAcquireTheRepositoryLock()
    {
        _appVersionService.Setup(service => service.IsV9App(_editingContext)).Returns(true);

        bool lockedDuringRequest = await Invoke(
            nameof(ApplicationMetadataController),
            nameof(ApplicationMetadataController.GetApplicationMetadata),
            "GET"
        );

        Assert.False(lockedDuringRequest);
        Assert.Equal(0, _locksAcquired);
    }

    [Fact]
    public async Task RepositoryPull_UsesTheRepositoryLockForV8Apps()
    {
        _appVersionService.Setup(service => service.IsV9App(_editingContext)).Returns(false);

        bool lockedDuringRequest = await Invoke(nameof(RepositoryController), nameof(RepositoryController.Pull), "GET");

        Assert.True(lockedDuringRequest);
        Assert.Equal(1, _locksAcquired);
        Assert.False(_lockHeld);
    }

    /// <summary>
    /// Returns whether the repository lock is held while the request runs.
    /// </summary>
    private async Task<bool> Invoke(string controllerTypeName, string actionName, string method)
    {
        using IServiceScope scope = _services.CreateScope();
        var actionDescriptor = new ControllerActionDescriptor
        {
            ControllerName = controllerTypeName[..^"Controller".Length],
            ActionName = actionName,
        };
        var httpContext = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        httpContext.SetEndpoint(new Endpoint(null, new EndpointMetadataCollection(actionDescriptor), actionName));
        httpContext.Request.Method = method;
        httpContext.Request.RouteValues["org"] = _editingContext.Org;
        httpContext.Request.RouteValues["app"] = _editingContext.Repo;
        httpContext.User = new ClaimsPrincipal(
            new ClaimsIdentity([new Claim(ClaimTypes.Name, _editingContext.Developer)])
        );
        bool lockedDuringRequest = false;
        var middleware = new RequestSynchronizationMiddleware(_ =>
        {
            lockedDuringRequest = _lockHeld;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(
            httpContext,
            scope.ServiceProvider.GetRequiredService<IRequestSyncEvaluator<AltinnRepoEditingContext>>(),
            scope.ServiceProvider.GetRequiredService<IRequestSyncEvaluator<AltinnOrgContext>>(),
            _lockService.Object
        );
        return lockedDuringRequest;
    }

    public void Dispose()
    {
        _services.Dispose();
        Directory.Delete(_repositoriesRoot, recursive: true);
    }
}
