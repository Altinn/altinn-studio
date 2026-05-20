using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class AppScopesServiceTest
{
    [Fact]
    public async Task AddDefaultMaskinportenScopesAsync_WhenAppScopesDoNotExist_CreatesDefaultScopes()
    {
        // Arrange
        AltinnRepoEditingContext context = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "app", "developer");
        Mock<IAppScopesRepository> appScopesRepository = new();
        appScopesRepository
            .Setup(r => r.GetAppScopesAsync(context, It.IsAny<CancellationToken>()))
            .ReturnsAsync((AppScopesEntity)null);
        appScopesRepository
            .Setup(r => r.UpsertAppScopesAsync(It.IsAny<AppScopesEntity>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AppScopesEntity entity, CancellationToken _) => entity);

        AppScopesService service = CreateAppScopesService(appScopesRepository.Object);

        // Act
        AppScopesEntity result = await service.AddDefaultMaskinportenScopesAsync(context);

        // Assert
        Assert.Equal(context.Org, result.Org);
        Assert.Equal(context.Repo, result.App);
        Assert.Equal(context.Developer, result.CreatedBy);
        Assert.Equal(context.Developer, result.LastModifiedBy);
        Assert.Contains(result.Scopes, s => s.Scope == DefaultMaskinportenScopes.ServiceOwner);
        Assert.Contains(result.Scopes, s => s.Scope == DefaultMaskinportenScopes.ServiceOwnerInstancesRead);
        Assert.Contains(result.Scopes, s => s.Scope == DefaultMaskinportenScopes.ServiceOwnerInstancesWrite);
        appScopesRepository.Verify(
            r => r.UpsertAppScopesAsync(It.IsAny<AppScopesEntity>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task AddDefaultMaskinportenScopesAsync_WhenDefaultScopesExist_DoesNotPersist()
    {
        // Arrange
        AltinnRepoEditingContext context = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "app", "developer");
        AppScopesEntity appScopes = new()
        {
            Org = context.Org,
            App = context.Repo,
            Scopes = new HashSet<MaskinPortenScopeEntity>
            {
                new() { Scope = DefaultMaskinportenScopes.ServiceOwner },
                new() { Scope = DefaultMaskinportenScopes.ServiceOwnerInstancesRead },
                new() { Scope = DefaultMaskinportenScopes.ServiceOwnerInstancesWrite },
            },
        };

        Mock<IAppScopesRepository> appScopesRepository = new();
        appScopesRepository
            .Setup(r => r.GetAppScopesAsync(context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(appScopes);

        AppScopesService service = CreateAppScopesService(appScopesRepository.Object);

        // Act
        AppScopesEntity result = await service.AddDefaultMaskinportenScopesAsync(context);

        // Assert
        Assert.Same(appScopes, result);
        appScopesRepository.Verify(
            r => r.UpsertAppScopesAsync(It.IsAny<AppScopesEntity>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public void DefaultMaskinportenScopesMergeWith_WhenInputHasDuplicateScopeNames_KeepsFirstScope()
    {
        ISet<MaskinPortenScopeEntity> scopes = new HashSet<MaskinPortenScopeEntity>
        {
            new() { Scope = "custom:scope", Description = "first" },
            new() { Scope = "custom:scope", Description = "second" },
        };

        ISet<MaskinPortenScopeEntity> result = DefaultMaskinportenScopes.MergeWith(scopes);

        Assert.Equal("first", result.Single(s => s.Scope == "custom:scope").Description);
        Assert.Contains(result, s => s.Scope == DefaultMaskinportenScopes.ServiceOwner);
        Assert.Contains(result, s => s.Scope == DefaultMaskinportenScopes.ServiceOwnerInstancesRead);
        Assert.Contains(result, s => s.Scope == DefaultMaskinportenScopes.ServiceOwnerInstancesWrite);
    }

    [Fact]
    public async Task GetAppScopesAsync_WhenOrgIsNotAltinnOrg_ThrowsAndDoesNotReadRepository()
    {
        AltinnRepoContext context = AltinnRepoContext.FromOrgRepo("developer", "app");
        Mock<IAppScopesRepository> appScopesRepository = new(MockBehavior.Strict);
        AppScopesService service = CreateAppScopesService(appScopesRepository.Object, isAltinnOrg: false);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.GetAppScopesAsync(context));
    }

    [Fact]
    public async Task UpsertScopesAsync_WhenOrgIsNotAltinnOrg_ThrowsAndDoesNotPersist()
    {
        AltinnRepoEditingContext context = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            "developer",
            "app",
            "developer"
        );
        Mock<IAppScopesRepository> appScopesRepository = new(MockBehavior.Strict);
        AppScopesService service = CreateAppScopesService(appScopesRepository.Object, isAltinnOrg: false);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpsertScopesAsync(
                context,
                new HashSet<MaskinPortenScopeEntity> { new() { Scope = "custom:scope" } }
            )
        );
    }

    [Fact]
    public async Task AddDefaultMaskinportenScopesAsync_WhenOrgIsNotAltinnOrg_ReturnsNullAndDoesNotPersist()
    {
        AltinnRepoEditingContext context = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            "developer",
            "app",
            "developer"
        );
        Mock<IAppScopesRepository> appScopesRepository = new(MockBehavior.Strict);
        AppScopesService service = CreateAppScopesService(appScopesRepository.Object, isAltinnOrg: false);

        AppScopesEntity result = await service.AddDefaultMaskinportenScopesAsync(context);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetAppScopesAsync_WhenServiceOwnerLookupIsCanceled_ThrowsOperationCanceledException()
    {
        AltinnRepoContext context = AltinnRepoContext.FromOrgRepo("ttd", "app");
        Mock<IAppScopesRepository> appScopesRepository = new(MockBehavior.Strict);
        Mock<IEnvironmentsService> environmentsService = new();
        environmentsService
            .Setup(s => s.IsAltinnOrg(context.Org, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());
        AppScopesService service = new(appScopesRepository.Object, environmentsService.Object, TimeProvider.System);

        await Assert.ThrowsAsync<OperationCanceledException>(() => service.GetAppScopesAsync(context));
    }

    private static AppScopesService CreateAppScopesService(
        IAppScopesRepository appScopesRepository,
        bool isAltinnOrg = true
    )
    {
        Mock<IEnvironmentsService> environmentsService = new();
        environmentsService
            .Setup(s => s.IsAltinnOrg(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(isAltinnOrg);

        return new AppScopesService(appScopesRepository, environmentsService.Object, TimeProvider.System);
    }
}
