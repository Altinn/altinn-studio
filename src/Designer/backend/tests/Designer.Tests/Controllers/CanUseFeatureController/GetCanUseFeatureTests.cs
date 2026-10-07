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

public class GetCanUseFeatureTests
    : DesignerEndpointsTestsBase<GetCanUseFeatureTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "kari";
    private const string App = "test-app";

    private readonly Mock<ICanUseFeatureEvaluator> _evaluatorMock = new();

    public GetCanUseFeatureTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);

        _evaluatorMock.Setup(e => e.Feature).Returns(CanUseFeatureEnum.UploadDataModel);
        _evaluatorMock.Setup(e => e.CanUseFeatureAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(true);

        services.AddSingleton<IEnumerable<ICanUseFeatureEvaluator>>(new[] { _evaluatorMock.Object });
        services.AddSingleton<CanUseFeatureEvaluatorRegistry>();
    }

    [Fact]
    public async Task CanUseFeature_Returns200Ok_WithTrue()
    {
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, ApiUrl("UploadDataModel"));
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<CanUseFeatureDto>(
            responseBody,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );

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

    [Fact]
    public async Task CanUseFeature_PassesTheRepositoryToTheEvaluator()
    {
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, ApiUrl("UploadDataModel"));
        using var response = await HttpClient.SendAsync(httpRequestMessage);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _evaluatorMock.Verify(e => e.CanUseFeatureAsync(Org, App), Times.Once);
    }

    [Fact]
    public async Task CanUseFeature_Returns404NotFound_ForInvalidAppName()
    {
        using var httpRequestMessage = new HttpRequestMessage(
            HttpMethod.Get,
            $"designer/api/{Org}/datamodels/CanUseFeature?featureName=UploadDataModel"
        );
        using var response = await HttpClient.SendAsync(httpRequestMessage);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static string ApiUrl(string featureName) =>
        $"designer/api/{Org}/{App}/CanUseFeature?featureName={featureName}";
}
