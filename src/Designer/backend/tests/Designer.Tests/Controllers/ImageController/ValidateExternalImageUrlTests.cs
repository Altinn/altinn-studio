#nullable disable
using System;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Filters;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using Xunit;

namespace Designer.Tests.Controllers.ImageController;

public class ValidateExternalImageUrlTests(
    WebApplicationFactory<Program> factory,
    MockServerFixture mockServerFixture
)
    : DesignerEndpointsTestsBase<ValidateExternalImageUrlTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<MockServerFixture>
{
    private readonly MockServerFixture _mockServerFixture = mockServerFixture;
    private const string VersionPrefix = "designer/api";
    private const string Org = "ttd";
    private const string EmptyApp = "empty-app";

    [Fact]
    public async Task ValidateExternalImageUrl_WhenUrlIsPointingToAnImage_ReturnsOk()
    {
        IRequestBuilder validImageRequest = Request.Create().UsingHead();
        IResponseBuilder validImageResponse = Response
            .Create()
            .WithSuccess()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Image.Png)
            .WithBody("image");
        _mockServerFixture.MockApi.Given(validImageRequest).RespondWith(validImageResponse);

        string urlPointingToImage = _mockServerFixture.MockApi.Url;
        string path = $"{VersionPrefix}/{Org}/{EmptyApp}/images/validate?url={urlPointingToImage}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string validationResult = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ImageUrlValidationResult.Ok.ToString(), validationResult.Trim('"'));
    }

    [Fact]
    public async Task ValidateExternalImageUrl_WhenUrlIsNotFound_ReturnsNotValidIm()
    {
        _mockServerFixture.MockApi.Reset();
        IRequestBuilder notFoundRequest = Request.Create().UsingHead();
        IResponseBuilder notFoundResponse = Response
            .Create()
            .WithStatusCode(404);

        _mockServerFixture.MockApi.Given(notFoundRequest).RespondWith(notFoundResponse);

        string unreachableUrl = _mockServerFixture.MockApi.Url + "/notvalidurl";
        string path = $"{VersionPrefix}/{Org}/{EmptyApp}/images/validate?url={Uri.EscapeDataString(unreachableUrl)}";

        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string validationResult = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(ImageUrlValidationResult.NotValidImage.ToString(), validationResult.Trim('"'));
    }

    [Fact]
    [UseSystemTextJson]
    public async Task ValidateExternalImageUrl_WhenUrlIsNotPointingToAnImage_ReturnsNotValidImage()
    {
        IRequestBuilder validNonImageRequest = Request.Create().UsingHead();
        IResponseBuilder validNonImageResponse = Response
            .Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Text.Html);
        _mockServerFixture.MockApi.Given(validNonImageRequest).RespondWith(validNonImageResponse);

        string urlPointingToNonImage = _mockServerFixture.MockApi.Url;
        string path =
            $"{VersionPrefix}/{Org}/{EmptyApp}/images/validate?url={urlPointingToNonImage}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string validationResult = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(ImageUrlValidationResult.NotValidImage.ToString(), validationResult.Trim('"'));
    }
}
