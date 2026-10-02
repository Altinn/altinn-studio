using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.PolicyAdmin.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PolicyControllerTests;

public class GetAppPolicyTests
    : DesignerEndpointsTestsBase<GetAppPolicyTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly string _versionPrefix = "designer/api";

    public GetAppPolicyTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Fact]
    public async Task GetApp_AppPolicyOk()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "apps-test", "testUser", targetRepository);
        ResourcePolicy resourcePolicy;

        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy";
        using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData))
        {
            HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            Assert.Null(response.Headers.ETag);
            string responseBody = await response.Content.ReadAsStringAsync();
            resourcePolicy = JsonSerializer.Deserialize<ResourcePolicy>(
                responseBody,
                new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
            );
        }

        Assert.NotNull(resourcePolicy.Rules);
        Assert.Equal(6, resourcePolicy.Rules.Count);
    }

    [Fact]
    public async Task GetV9ApplicationPolicy_ReturnsAStableStrongEntityTag()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "app-with-layoutsets-v9", "testUser", targetRepository);
        string endpoint = $"{_versionPrefix}/ttd/{targetRepository}/policy";

        using HttpResponseMessage first = await HttpClient.GetAsync(endpoint);
        using HttpResponseMessage second = await HttpClient.GetAsync(endpoint);

        first.EnsureSuccessStatusCode();
        Assert.NotNull(first.Headers.ETag);
        Assert.False(first.Headers.ETag.IsWeak);
        Assert.Equal(first.Headers.ETag, second.Headers.ETag);
    }
}
