using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.StudioOidcGiteaIntegrationTests;

public class GiteaDbAppCounterStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<GiteaDbAppCounterStudioOidcTests>
{
    public GiteaDbAppCounterStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Fact]
    public async Task CountAppsByOrganization_CountsTheOrganizationsAppsButNotItsSharedRepositories()
    {
        string org = $"count-{Guid.NewGuid():N}"[..20];
        string emptyOrg = $"empty-{Guid.NewGuid():N}"[..20];
        await CreateOrg(org);
        await CreateOrg(emptyOrg);
        string[] apps = ["app-1", "app-2", $"{org}-resources-old"];
        foreach (string repository in apps.Concat([$"{org}-content", $"{org}-datamodels", $"{org}-resources"]))
        {
            await CreateRepository($"orgs/{org}/repos", repository);
        }
        await CreateRepository($"admin/users/{GiteaConstants.TestUser}/repos", $"own-{Guid.NewGuid():N}"[..20]);

        IReadOnlyDictionary<string, int> counts = await new GiteaDbAppCounter(
            new GiteaDbSettings { ConnectionString = GiteaFixture.DbConnectionString }
        ).CountAppsByOrganization(CancellationToken.None);

        Assert.Equal(apps.Length, counts[org]);
        Assert.False(counts.ContainsKey(emptyOrg));
        Assert.False(counts.ContainsKey(GiteaConstants.TestUser.ToLowerInvariant()));
    }

    private async Task CreateOrg(string org)
    {
        using HttpResponseMessage response = await GiteaFixture.GiteaClient.Value.PostAsJsonAsync(
            "orgs",
            new { username = org, visibility = "public" }
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // Private, since an organization's private repositories are the ones the Gitea API hides from Designer.
    private async Task CreateRepository(string path, string repository)
    {
        using HttpResponseMessage response = await GiteaFixture.GiteaClient.Value.PostAsJsonAsync(
            path,
            new { name = repository, @private = true }
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }
}
