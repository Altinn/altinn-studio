#nullable enable
using System.IO;
using System.Net;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController;

public class GetFiksArkivRoutingTests
    : DesignerEndpointsTestsBase<GetFiksArkivRoutingTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    public GetFiksArkivRoutingTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Theory]
    [InlineData(null, "reject")]
    [InlineData("archived", "rejected")]
    public async Task ReturnsConfiguredActionsIncludingNullSuccess(string? success, string failure)
    {
        string repository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "app-with-options", "testUser", repository);
        await File.WriteAllTextAsync(
            Path.Combine(TestRepoPath, "App", "appsettings.json"),
            JsonConvert.SerializeObject(
                new
                {
                    FiksArkivSettings = new
                    {
                        SuccessHandling = new { Action = success },
                        ErrorHandling = new { Action = failure },
                    },
                }
            )
        );

        using var response = await HttpClient.GetAsync(
            $"/designer/api/ttd/{repository}/process-modelling/fiks-arkiv-routing"
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = JObject.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(success is null ? JTokenType.Null : JTokenType.String, result["successAction"]!.Type);
        Assert.Equal(success, (string?)result["successAction"]);
        Assert.Equal(failure, (string?)result["failureAction"]);
        Assert.Equal(JTokenType.Null, result["unavailableReason"]!.Type);
    }
}
