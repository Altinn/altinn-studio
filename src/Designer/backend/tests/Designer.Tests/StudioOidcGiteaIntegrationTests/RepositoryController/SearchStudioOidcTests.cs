using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.StudioOidcGiteaIntegrationTests.RepositoryController;

public class SearchStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<SearchStudioOidcTests>
{
    private const int PageSize = 5;

    public SearchStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task Search_WithExcludeNonAppRepos_LeavesOutTheSharedRepositoriesAndKeepsEveryApp()
    {
        string org = $"search-{Guid.NewGuid():N}"[..20];
        int orgId = await CreateOrg(org);
        string[] apps = [.. Enumerable.Range(1, 8).Select(number => $"app-{number}"), $"{org}-resources-old"];
        foreach (string repository in apps.Concat([$"{org}-content", $"{org}-datamodels", $"{org}-resources"]))
        {
            await CreateRepository(org, repository);
        }

        SearchResults allRepositories = await Search($"uId={orgId}&page=1&limit={PageSize}&sortBy=alpha");
        SearchResults[] pages =
        [
            await Search($"uId={orgId}&page=1&limit={PageSize}&sortBy=alpha&excludeNonAppRepos=true"),
            await Search($"uId={orgId}&page=2&limit={PageSize}&sortBy=alpha&excludeNonAppRepos=true"),
            await Search($"uId={orgId}&page=3&limit={PageSize}&sortBy=alpha&excludeNonAppRepos=true"),
        ];

        Assert.Equal(12, allRepositories.TotalCount);
        Assert.All(pages, page => Assert.Equal(apps.Length, page.TotalCount));
        Assert.All(pages, page => Assert.Equal(3, page.TotalPages));
        Assert.Equal(["app-1", "app-2", "app-3", "app-4", "app-5"], Names(pages[0]));
        Assert.Equal(["app-6", "app-7", "app-8"], Names(pages[1]));
        Assert.Equal([$"{org}-resources-old"], Names(pages[2]));
    }

    private async Task<SearchResults> Search(string query)
    {
        using HttpResponseMessage response = await HttpClient.GetAsync($"designer/api/repos/search?{query}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<SearchResults>();
    }

    private async Task<int> CreateOrg(string org)
    {
        using HttpResponseMessage response = await GiteaFixture.GiteaClient.Value.PostAsJsonAsync(
            "orgs",
            new { username = org, visibility = "public" }
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        JsonElement created = await response.Content.ReadFromJsonAsync<JsonElement>();
        return created.GetProperty("id").GetInt32();
    }

    private async Task CreateRepository(string org, string repository)
    {
        using HttpResponseMessage response = await GiteaFixture.GiteaClient.Value.PostAsJsonAsync(
            $"orgs/{org}/repos",
            new { name = repository, @private = false }
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private static List<string> Names(SearchResults page) => page.Data.Select(repository => repository.Name).ToList();
}
