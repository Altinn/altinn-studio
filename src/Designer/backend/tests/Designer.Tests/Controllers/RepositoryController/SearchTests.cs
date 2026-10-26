using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using RepositoryModel = Altinn.Studio.Designer.RepositoryClient.Model.Repository;

namespace Designer.Tests.Controllers.RepositoryController;

public class SearchTests : DesignerEndpointsTestsBase<SearchTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string SearchUrl = "/designer/api/repos/search";
    private const string SharedRepositoryKeyword = "-datamodels,-content,-resources";

    private readonly Mock<IGiteaClient> _giteaClientMock = new();

    public SearchTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);

        _giteaClientMock
            .Setup(client => client.SearchRepo(It.Is<SearchOptions>(options => options.Keyword == null)))
            .ReturnsAsync(Results("ttd/app-a", "ttd/ttd-content", "ttd/ttd-resources"));
        _giteaClientMock
            .Setup(client =>
                client.SearchRepo(It.Is<SearchOptions>(options => options.Keyword == SharedRepositoryKeyword))
            )
            .ReturnsAsync(Results("ttd/ttd-content", "ttd/ttd-resources"));
        services.AddSingleton(_giteaClientMock.Object);
    }

    [Fact]
    public async Task Search_WithExcludeNonAppRepos_LeavesOutTheSharedRepositories()
    {
        using HttpResponseMessage response = await HttpClient.GetAsync(
            $"{SearchUrl}?uId=2&page=1&limit=5&excludeNonAppRepos=true"
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        SearchResults result = await response.Content.ReadFromJsonAsync<SearchResults>();
        Assert.Equal(["app-a"], result.Data.Select(repository => repository.Name));
        Assert.Equal(1, result.TotalCount);
    }

    [Fact]
    public async Task Search_WithoutExcludeNonAppRepos_ReturnsGiteasResults()
    {
        using HttpResponseMessage response = await HttpClient.GetAsync($"{SearchUrl}?uId=2&page=1&limit=5");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        SearchResults result = await response.Content.ReadFromJsonAsync<SearchResults>();
        Assert.Equal(["app-a", "ttd-content", "ttd-resources"], result.Data.Select(repository => repository.Name));
        Assert.Equal(3, result.TotalCount);
    }

    [Fact]
    public async Task Search_WithExcludeNonAppReposAndKeyword_ReturnsBadRequest()
    {
        using HttpResponseMessage response = await HttpClient.GetAsync(
            $"{SearchUrl}?keyword=app&excludeNonAppRepos=true"
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _giteaClientMock.Verify(client => client.SearchRepo(It.IsAny<SearchOptions>()), Times.Never);
    }

    private static SearchResults Results(params string[] fullNames) =>
        new()
        {
            Data = fullNames
                .Select(fullName => new RepositoryModel
                {
                    Name = fullName.Split('/')[1],
                    FullName = fullName,
                    Owner = new User { Login = fullName.Split('/')[0] },
                })
                .ToList(),
            TotalCount = fullNames.Length,
            TotalPages = 1,
        };
}
