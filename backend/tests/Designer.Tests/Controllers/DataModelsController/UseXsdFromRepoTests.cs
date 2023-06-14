using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class UseXsdFromRepoTests : DisagnerEndpointsTestsBase<DatamodelsController, UseXsdFromRepoTests>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/datamodels";
    public UseXsdFromRepoTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "ttd-datamodels", "testUser")]
    public async Task UseXsdFromRepo_DatamodelsRepo_ShouldReturnCreated(string org, string sourceRepository, string developer)
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();

        await CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        string filePath = "/App/models/41111.xsd";
        string url = $"{VersionPrefix(org, targetRepository)}/xsd-from-repo?filePath={filePath}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url);

        using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
