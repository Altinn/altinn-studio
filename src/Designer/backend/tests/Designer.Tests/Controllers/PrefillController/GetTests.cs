using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PrefillController;

public class GetTests : DesignerEndpointsTestsBase<GetTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/datamodels";

    private string TargetTestRepository { get; }

    public GetTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        TargetTestRepository = TestDataHelper.GenerateTestRepoName();
    }

    [Theory]
    [InlineData("App/models/HvemErHvem_SERES.schema.json", "ttd", "hvem-er-hvem", "testUser")]
    public async Task Get_NoPrefillFileExists_ShouldReturnNoContent(
        string modelPath,
        string org,
        string repo,
        string user
    )
    {
        await CopyRepositoryForTest(org, repo, user, TargetTestRepository);
        string url = $"{VersionPrefix(org, TargetTestRepository)}/prefill?modelPath={modelPath}";

        using var response = await HttpClient.GetAsync(url);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Theory]
    [InlineData("../../../App/models/HvemErHvem_SERES.schema.json", "ttd", "hvem-er-hvem", "testUser")]
    public async Task Get_ModelPathContainsPathTraversal_ShouldNotSucceed(
        string modelPath,
        string org,
        string repo,
        string user
    )
    {
        await CopyRepositoryForTest(org, repo, user, TargetTestRepository);
        string url = $"{VersionPrefix(org, TargetTestRepository)}/prefill?modelPath={modelPath}";

        using var response = await HttpClient.GetAsync(url);

        Assert.NotEqual(HttpStatusCode.OK, response.StatusCode);
    }
}
