using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.PolicyAdmin.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.PolicyControllerTests;

public class UpdateApplicationPolicyTests
    : DesignerEndpointsTestsBase<UpdateApplicationPolicyTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly string _versionPrefix = "designer/api";

    public UpdateApplicationPolicyTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Fact]
    public async Task Update_AppPolicyOk()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "apps-test", "testUser", targetRepository);

        ResourcePolicy resourcePolicy = TestPolicyHelper.GenerateTestPolicy("ttd", targetRepository);

        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy";
        string responseBody;
        using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData))
        {
            httpRequestMessage.Content = new StringContent(
                JsonConvert.SerializeObject(resourcePolicy),
                Encoding.UTF8,
                "application/json"
            );

            HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            Assert.Null(response.Headers.ETag);
            responseBody = await response.Content.ReadAsStringAsync();
        }

        Assert.NotEmpty(responseBody);
    }

    [Fact]
    public async Task UpdateV9ApplicationPolicy_RejectsMissingOrStaleEntityTags()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "app-with-layoutsets-v9", "testUser", targetRepository);
        Directory.CreateDirectory(Path.Combine(TestRepoPath, "App", "config", "authorization"));
        string endpoint = $"{_versionPrefix}/ttd/{targetRepository}/policy";
        using HttpResponseMessage loaded = await HttpClient.GetAsync(endpoint);
        EntityTagHeaderValue loadedEntityTag = loaded.Headers.ETag;
        Assert.NotNull(loadedEntityTag);
        ResourcePolicy policy = TestPolicyHelper.GenerateTestPolicy("ttd", targetRepository);
        policy.Rules[0].Description = "A new payment rule";

        using HttpResponseMessage withoutPrecondition = await SendPolicy(HttpMethod.Put, endpoint, policy, null);
        Assert.Equal(HttpStatusCode.PreconditionRequired, withoutPrecondition.StatusCode);
        Assert.Empty(ReadPolicyFile(targetRepository));

        using HttpResponseMessage accepted = await SendPolicy(HttpMethod.Put, endpoint, policy, loadedEntityTag);
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        EntityTagHeaderValue savedEntityTag = accepted.Headers.ETag;
        Assert.NotNull(savedEntityTag);
        Assert.NotEqual(loadedEntityTag, savedEntityTag);
        ResourcePolicy saved = JsonConvert.DeserializeObject<ResourcePolicy>(
            await accepted.Content.ReadAsStringAsync()
        );
        Assert.Equal("A new payment rule", saved.Rules[0].Description);
        using HttpResponseMessage reloaded = await HttpClient.GetAsync(endpoint);
        Assert.Equal(savedEntityTag, reloaded.Headers.ETag);

        policy.Rules[0].Description = "An old draft";
        using HttpResponseMessage rejected = await SendPolicy(HttpMethod.Put, endpoint, policy, loadedEntityTag);
        Assert.Equal(HttpStatusCode.PreconditionFailed, rejected.StatusCode);
        string file = ReadPolicyFile(targetRepository);
        Assert.Contains("A new payment rule", file);
        Assert.DoesNotContain("An old draft", file);

        using HttpResponseMessage nextSave = await SendPolicy(HttpMethod.Put, endpoint, policy, savedEntityTag);
        Assert.Equal(HttpStatusCode.OK, nextSave.StatusCode);
        Assert.Contains("An old draft", ReadPolicyFile(targetRepository));
    }

    [Fact]
    public async Task PostV9ApplicationPolicy_WithoutIfMatch_ReturnsPreconditionRequired()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "app-with-layoutsets-v9", "testUser", targetRepository);
        Directory.CreateDirectory(Path.Combine(TestRepoPath, "App", "config", "authorization"));
        string endpoint = $"{_versionPrefix}/ttd/{targetRepository}/policy";
        ResourcePolicy policy = TestPolicyHelper.GenerateTestPolicy("ttd", targetRepository);

        using HttpResponseMessage response = await SendPolicy(HttpMethod.Post, endpoint, policy, null);

        Assert.Equal(HttpStatusCode.PreconditionRequired, response.StatusCode);
        Assert.Empty(ReadPolicyFile(targetRepository));
    }

    [Fact]
    public async Task Create_ResourcePolicyOk()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);

        ResourcePolicy resourcePolicy = TestPolicyHelper.GenerateTestPolicy("ttd", targetRepository, "ttdres2");
        string responseBody;
        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/ttdres2";

        using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, dataPathWithData))
        {
            httpRequestMessage.Content = new StringContent(
                JsonConvert.SerializeObject(resourcePolicy),
                Encoding.UTF8,
                "application/json"
            );
            HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            responseBody = await response.Content.ReadAsStringAsync();
        }

        Assert.NotEmpty(responseBody);
    }

    private async Task<HttpResponseMessage> SendPolicy(
        HttpMethod method,
        string endpoint,
        ResourcePolicy policy,
        EntityTagHeaderValue ifMatch
    )
    {
        using var request = new HttpRequestMessage(method, endpoint)
        {
            Content = new StringContent(JsonConvert.SerializeObject(policy), Encoding.UTF8, "application/json"),
        };
        if (ifMatch is not null)
        {
            request.Headers.IfMatch.Add(ifMatch);
        }
        return await HttpClient.SendAsync(request);
    }

    private static string ReadPolicyFile(string repository) =>
        TestDataHelper.GetFileFromRepo("ttd", repository, "testUser", "App/config/authorization/policy.xml");
}
