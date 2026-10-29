using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController;

public class GetRepositoryResourceListTests
    : ResourceAdminControllerTestsBaseClass<GetRepositoryResourceListTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<ISourceControl> _sourceControlMock = new();

    public GetRepositoryResourceListTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        _sourceControlMock
            .Setup(sourceControl => sourceControl.GetTopLevelFolderHistory(It.IsAny<AltinnRepoEditingContext>()))
            .Returns([]);
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddTransient(_ => _sourceControlMock.Object);
    }

    [Fact]
    public async Task GetResourceList_OK()
    {
        // Arrange
        string uri = $"{VersionPrefix}/ttd/resources/resourcelist";

        RepositoryMock
            .Setup(r =>
                r.GetServiceResources(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<System.Threading.CancellationToken>()
                )
            )
            .Returns(
                Task.FromResult(
                    new List<ServiceResource>
                    {
                        new ServiceResource
                        {
                            Identifier = "testresource",
                            Title = new Dictionary<string, string>(),
                            Description = new Dictionary<string, string>(),
                            RightDescription = new Dictionary<string, string>(),
                            Homepage = "test.no",
                            Status = string.Empty,
                            IsPartOf = string.Empty,
                            ThematicArea = string.Empty,
                            ResourceReferences = GetTestResourceReferences(),
                            Delegable = true,
                            Visible = true,
                            HasCompetentAuthority = new CompetentAuthority
                            {
                                Organization = "ttd",
                                Orgcode = "test",
                                Name = new Dictionary<string, string>(),
                            },
                            Keywords = GetTestKeywords(),
                            ResourceType = ResourceType.Default,
                        },
                    }
                )
            );

        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

        // Act
        using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task GetResourceList_SetsCreatedByAndLastChangedFromTheFolderHistory()
    {
        // Arrange
        string uri = $"{VersionPrefix}/ttd/resources/resourcelist";
        RepositoryMock
            .Setup(r =>
                r.GetServiceResources(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<System.Threading.CancellationToken>()
                )
            )
            .ReturnsAsync([
                new ServiceResource { Identifier = "shared", Title = new Dictionary<string, string>() },
                new ServiceResource { Identifier = "not-shared", Title = new Dictionary<string, string>() },
            ]);
        DateTimeOffset lastCommitTime = new(2026, 1, 1, 12, 0, 0, TimeSpan.FromHours(1));
        _sourceControlMock
            .Setup(sourceControl => sourceControl.GetTopLevelFolderHistory(It.IsAny<AltinnRepoEditingContext>()))
            .Returns(new Dictionary<string, FolderHistory> { ["shared"] = new("alice", lastCommitTime) });

        // Act
        using HttpResponseMessage res = await HttpClient.GetAsync(uri);
        List<ListviewServiceResource> resources = await res.Content.ReadFromJsonAsync<List<ListviewServiceResource>>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        ListviewServiceResource shared = resources.Single(resource => resource.Identifier == "shared");
        Assert.Equal("alice", shared.CreatedBy);
        Assert.Equal(lastCommitTime.UtcDateTime, shared.LastChanged);
        ListviewServiceResource notShared = resources.Single(resource => resource.Identifier == "not-shared");
        Assert.Null(notShared.CreatedBy);
        Assert.Null(notShared.LastChanged);
    }

    [Fact]
    public async Task GetResourceList_NoContent()
    {
        // Arrange
        string uri = $"{VersionPrefix}/orgwithoutrepo/resources/resourcelist";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

        RepositoryMock
            .Setup(r =>
                r.GetServiceResources(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<System.Threading.CancellationToken>()
                )
            )
            .Returns(Task.FromResult(new List<ServiceResource>()));

        // Act
        using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }
}
