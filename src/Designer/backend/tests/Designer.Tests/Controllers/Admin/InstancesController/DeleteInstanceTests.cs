using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Rest.TransientFaultHandling;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.Admin.InstancesController;

public class DeleteInstanceTests
    : DesignerEndpointsTestsBase<DeleteInstanceTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string OwnedOrg = "ttd";
    private const string Env = "tt02";
    private const string App = "test-app";
    private const string InstanceId = "51e58b12-6de1-4d0f-9052-ec2ee9d43adf";

    private readonly Mock<IAltinnStorageInstancesClient> _instancesClientMock = new();
    private readonly Mock<IAdminAuditLogger> _auditLoggerMock = new();
    private readonly Mock<IGiteaClient> _giteaClientMock = new();

    public DeleteInstanceTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);

        _giteaClientMock
            .Setup(c => c.GetTeams())
            .ReturnsAsync(
                new List<Team>
                {
                    new()
                    {
                        Name = "Owners",
                        Organization = new Organization { Username = OwnedOrg },
                    },
                }
            );

        services.AddSingleton(_instancesClientMock.Object);
        services.AddSingleton(_auditLoggerMock.Object);
        services.AddSingleton(_giteaClientMock.Object);
    }

    [Fact]
    public async Task DeleteInstance_WhenUserIsOrgOwner_DeletesInstanceAndWritesAuditLog()
    {
        using var response = await HttpClient.DeleteAsync(ApiUrl(OwnedOrg));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _instancesClientMock.Verify(
            c => c.DeleteInstance(OwnedOrg, Env, App, InstanceId, It.IsAny<CancellationToken>()),
            Times.Once
        );
        _auditLoggerMock.Verify(
            l => l.LogInstanceDeletedAsync(OwnedOrg, Env, App, InstanceId, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task DeleteInstance_WhenUserIsNotOrgOwner_ReturnsForbiddenWithoutDeleting()
    {
        const string NotOwnedOrg = "someorg";

        using var response = await HttpClient.DeleteAsync(ApiUrl(NotOwnedOrg));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _instancesClientMock.Verify(
            c =>
                c.DeleteInstance(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        _auditLoggerMock.Verify(
            l =>
                l.LogInstanceDeletedAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task DeleteInstance_WhenStorageCallFails_DoesNotWriteAuditLog()
    {
        _instancesClientMock
            .Setup(c => c.DeleteInstance(OwnedOrg, Env, App, InstanceId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestWithStatusException("Not found") { StatusCode = HttpStatusCode.NotFound });

        using var response = await HttpClient.DeleteAsync(ApiUrl(OwnedOrg));

        Assert.False(response.IsSuccessStatusCode);
        _auditLoggerMock.Verify(
            l =>
                l.LogInstanceDeletedAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    private static string ApiUrl(string org) => $"designer/api/v1/admin/instances/{org}/{Env}/{App}/{InstanceId}";
}
