using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PrefillController;

public class PutTests : DesignerEndpointsTestsBase<PutTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/datamodels";

    private string TargetTestRepository { get; }

    private const string PrefillConfig =
        "{\"ER\":{\"OrgNumber\":\"Foretak.OrgNr\"},\"QueryParameters\":{\"caseId\":\"Sak.Id\"}}";

    public PutTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        TargetTestRepository = TestDataHelper.GenerateTestRepoName();
    }

    [Theory]
    [InlineData("App/models/HvemErHvem_SERES.schema.json", "ttd", "hvem-er-hvem", "testUser")]
    public async Task Put_ValidInput_ShouldReturnNoContent_AndCreatePrefillFile(
        string modelPath,
        string org,
        string repo,
        string user
    )
    {
        await CopyRepositoryForTest(org, repo, user, TargetTestRepository);
        string url = $"{VersionPrefix(org, TargetTestRepository)}/prefill?modelPath={modelPath}";

        using var putRequest = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(PrefillConfig, Encoding.UTF8, MediaTypeNames.Application.Json),
        };
        using var putResponse = await HttpClient.SendAsync(putRequest);
        Assert.Equal(HttpStatusCode.NoContent, putResponse.StatusCode);

        string prefillFilePath = Path.Combine(TestRepoPath, "App", "models", "HvemErHvem_SERES.prefill.json");
        Assert.True(File.Exists(prefillFilePath));

        using var getResponse = await HttpClient.GetAsync(
            $"{VersionPrefix(org, TargetTestRepository)}/prefill?modelPath={modelPath}"
        );
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        string content = await getResponse.Content.ReadAsStringAsync();
        Assert.Contains("Foretak.OrgNr", content);
        Assert.Contains("caseId", content);
    }

    [Theory]
    [InlineData("App/models/HvemErHvem_SERES.schema.json", "ttd", "hvem-er-hvem", "testUser")]
    public async Task Put_CalledTwice_ShouldOverwritePreviousContent(
        string modelPath,
        string org,
        string repo,
        string user
    )
    {
        await CopyRepositoryForTest(org, repo, user, TargetTestRepository);
        string url = $"{VersionPrefix(org, TargetTestRepository)}/prefill?modelPath={modelPath}";

        using var firstPutRequest = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(PrefillConfig, Encoding.UTF8, MediaTypeNames.Application.Json),
        };
        await HttpClient.SendAsync(firstPutRequest);

        const string updatedPrefillConfig = "{\"ER\":{\"Name\":\"Foretak.Navn\"}}";
        using var secondPutRequest = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(updatedPrefillConfig, Encoding.UTF8, MediaTypeNames.Application.Json),
        };
        using var secondPutResponse = await HttpClient.SendAsync(secondPutRequest);
        Assert.Equal(HttpStatusCode.NoContent, secondPutResponse.StatusCode);

        using var getResponse = await HttpClient.GetAsync(
            $"{VersionPrefix(org, TargetTestRepository)}/prefill?modelPath={modelPath}"
        );
        string content = await getResponse.Content.ReadAsStringAsync();
        Assert.Contains("Foretak.Navn", content);
        Assert.DoesNotContain("OrgNumber", content);
    }

    [Theory]
    [InlineData("../../../App/models/HvemErHvem_SERES.schema.json", "ttd", "hvem-er-hvem", "testUser")]
    public async Task Put_ModelPathContainsPathTraversal_ShouldNotSucceed(
        string modelPath,
        string org,
        string repo,
        string user
    )
    {
        await CopyRepositoryForTest(org, repo, user, TargetTestRepository);
        string url = $"{VersionPrefix(org, TargetTestRepository)}/prefill?modelPath={modelPath}";

        using var putRequest = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(PrefillConfig, Encoding.UTF8, MediaTypeNames.Application.Json),
        };
        using var putResponse = await HttpClient.SendAsync(putRequest);

        Assert.NotEqual(HttpStatusCode.NoContent, putResponse.StatusCode);
    }
}
