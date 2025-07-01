using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.CanUseFeatureController;

public class GetCanUseFeatureTests : DesignerEndpointsTestsBase<GetCanUseFeatureTests>,
    IClassFixture<WebApplicationFactory<Program>>
{
    public GetCanUseFeatureTests(WebApplicationFactory<Program> factory)
        : base(factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var evaluatorMock = new Mock<ICanUseFeatureEvaluator>();
                evaluatorMock.Setup(e => e.Feature).Returns(CanUseFeatureEnum.UploadDataModel);
                evaluatorMock.Setup(e => e.CanUseFeatureAsync()).ReturnsAsync(true);

                services.AddSingleton<IEnumerable<ICanUseFeatureEvaluator>>(new[] { evaluatorMock.Object });
                services.AddSingleton<CanUseFeatureEvaluatorRegistry>();
            });
        }))
    { }

    [Fact]
    public async Task CanUseFeature_Returns200Ok_WithTrue()
    {
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, ApiUrl("UploadDataModel"));
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<CanUseFeatureDto>(responseBody,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(result);
        Assert.True(result.CanUseFeature);
    }

    [Fact]
    public async Task CanUseFeature_Returns400BadRequest_ForInvalidFeatureName()
    {
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, ApiUrl("InvalidFeature"));
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Invalid feature name", responseBody);
    }

   private static string ApiUrl(string featureName) => $"designer/api/CanUseFeature?featureName={featureName}";
}
