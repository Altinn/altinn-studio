using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Moq;
using Xunit;
using RepositoryModel = Altinn.Studio.Designer.RepositoryClient.Model.Repository;

namespace Designer.Tests.Services;

public class AppRepositorySearchServiceTests
{
    private const int OrgId = 7;
    private const string SharedRepositoryKeyword = "-datamodels,-content,-resources";

    private readonly Mock<IGiteaClient> _giteaClientMock = new();

    [Fact]
    public async Task SearchApps_LeavesTheSharedRepositoriesOutOfThePageAndTheTotal()
    {
        SearchOptions searchOptions = new()
        {
            UId = OrgId,
            Page = 1,
            Limit = 5,
        };
        SetUpPage(
            searchOptions,
            Results(
                totalCount: 11,
                totalPages: 3,
                "ttd/app-a",
                "ttd/ttd-content",
                "ttd/ttd-datamodels",
                "ttd/app-b",
                "ttd/app-c"
            )
        );
        SetUpSharedRepositorySearch(
            page: 1,
            Results(totalCount: 3, totalPages: 1, "ttd/ttd-content", "ttd/ttd-datamodels", "ttd/ttd-resources")
        );

        SearchResults result = await CreateService().SearchApps(searchOptions);

        Assert.Equal(["app-a", "app-b", "app-c"], result.Data.Select(repository => repository.Name));
        Assert.Equal(8, result.TotalCount);
        Assert.Equal(3, result.TotalPages);
    }

    [Fact]
    public async Task SearchApps_KeepsAppsWhoseNamesOnlyEndWithASharedSuffix()
    {
        SearchOptions searchOptions = new()
        {
            UId = OrgId,
            Page = 1,
            Limit = 5,
        };
        SetUpPage(
            searchOptions,
            Results(totalCount: 3, totalPages: 1, "ttd/my-app-resources", "ttd/ttd-datamodels-old", "ttd/ttd-resources")
        );
        SetUpSharedRepositorySearch(
            page: 1,
            Results(totalCount: 3, totalPages: 1, "ttd/my-app-resources", "ttd/ttd-datamodels-old", "ttd/ttd-resources")
        );

        SearchResults result = await CreateService().SearchApps(searchOptions);

        Assert.Equal(["my-app-resources", "ttd-datamodels-old"], result.Data.Select(repository => repository.Name));
        Assert.Equal(2, result.TotalCount);
    }

    [Fact]
    public async Task SearchApps_AcrossOwners_LeavesOutEachOwnersSharedRepositories()
    {
        SearchOptions searchOptions = new() { Page = 1, Limit = 5 };
        SetUpPage(
            searchOptions,
            Results(
                totalCount: 5,
                totalPages: 1,
                "skd/skd-resources",
                "skd/ttd-resources",
                "ttd/app-a",
                "ttd/ttd-resources",
                "user/user-datamodels"
            )
        );
        SetUpSharedRepositorySearch(
            page: 1,
            Results(
                totalCount: 4,
                totalPages: 1,
                "skd/skd-resources",
                "skd/ttd-resources",
                "ttd/ttd-resources",
                "user/user-datamodels"
            ),
            ownerId: 0
        );

        SearchResults result = await CreateService().SearchApps(searchOptions);

        Assert.Equal(["ttd-resources", "app-a"], result.Data.Select(repository => repository.Name));
        Assert.Equal(["skd", "ttd"], result.Data.Select(repository => repository.Owner.Login));
        Assert.Equal(2, result.TotalCount);
    }

    [Fact]
    public async Task SearchApps_CountsTheSharedRepositoriesOnEveryPageOfTheirSearch()
    {
        SearchOptions searchOptions = new()
        {
            UId = OrgId,
            Page = 1,
            Limit = 5,
        };
        SetUpPage(searchOptions, Results(totalCount: 20, totalPages: 4, "a/app-a"));
        SetUpSharedRepositorySearch(page: 1, Results(totalCount: 5, totalPages: 3, "a/a-content", "a/a-resources"));
        SetUpSharedRepositorySearch(page: 2, Results(totalCount: 5, totalPages: 3, "b/b-content", "b/old-b-content"));
        SetUpSharedRepositorySearch(page: 3, Results(totalCount: 5, totalPages: 3, "c/c-datamodels"));

        SearchResults result = await CreateService().SearchApps(searchOptions);

        Assert.Equal(16, result.TotalCount);
        Assert.Equal(4, result.TotalPages);
    }

    [Fact]
    public async Task SearchApps_PageSearchFails_ReturnsNull()
    {
        SearchOptions searchOptions = new()
        {
            UId = OrgId,
            Page = 1,
            Limit = 5,
        };
        SetUpPage(searchOptions, null);
        SetUpSharedRepositorySearch(page: 1, Results(totalCount: 0, totalPages: 0));

        Assert.Null(await CreateService().SearchApps(searchOptions));
    }

    [Fact]
    public async Task SearchApps_SharedRepositorySearchFails_ReturnsNull()
    {
        SearchOptions searchOptions = new()
        {
            UId = OrgId,
            Page = 1,
            Limit = 5,
        };
        SetUpPage(searchOptions, Results(totalCount: 1, totalPages: 1, "ttd/app-a"));
        SetUpSharedRepositorySearch(page: 1, null);

        Assert.Null(await CreateService().SearchApps(searchOptions));
    }

    private AppRepositorySearchService CreateService() => new(_giteaClientMock.Object);

    private void SetUpPage(SearchOptions searchOptions, SearchResults results) =>
        _giteaClientMock.Setup(client => client.SearchRepo(searchOptions)).ReturnsAsync(results);

    private void SetUpSharedRepositorySearch(int page, SearchResults results, int ownerId = OrgId) =>
        _giteaClientMock
            .Setup(client =>
                client.SearchRepo(
                    It.Is<SearchOptions>(options =>
                        options.Keyword == SharedRepositoryKeyword && options.UId == ownerId && options.Page == page
                    )
                )
            )
            .ReturnsAsync(results);

    private static SearchResults Results(int totalCount, int totalPages, params string[] fullNames) =>
        new()
        {
            Data = fullNames.Select(Repository).ToList(),
            TotalCount = totalCount,
            TotalPages = totalPages,
        };

    private static RepositoryModel Repository(string fullName)
    {
        string[] ownerAndName = fullName.Split('/');
        return new RepositoryModel
        {
            Name = ownerAndName[1],
            FullName = fullName,
            Owner = new User { Login = ownerAndName[0] },
        };
    }
}
