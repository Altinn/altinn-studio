using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Altinn.Studio.Designer.Services.Implementation;
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

        AppScopesService service = new(appScopesRepository.Object, TimeProvider.System);

        // Act
        AppScopesEntity result = await service.AddDefaultMaskinportenScopesAsync(context);

        // Assert
        Assert.Equal(context.Org, result.Org);
        Assert.Equal(context.Repo, result.App);
        Assert.Equal(context.Developer, result.CreatedBy);
        Assert.Equal(context.Developer, result.LastModifiedBy);
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
                new() { Scope = DefaultMaskinportenScopes.ServiceOwnerInstancesRead },
                new() { Scope = DefaultMaskinportenScopes.ServiceOwnerInstancesWrite },
            },
        };

        Mock<IAppScopesRepository> appScopesRepository = new();
        appScopesRepository
            .Setup(r => r.GetAppScopesAsync(context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(appScopes);

        AppScopesService service = new(appScopesRepository.Object, TimeProvider.System);

        // Act
        AppScopesEntity result = await service.AddDefaultMaskinportenScopesAsync(context);

        // Assert
        Assert.Same(appScopes, result);
        appScopesRepository.Verify(
            r => r.UpsertAppScopesAsync(It.IsAny<AppScopesEntity>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }
}
