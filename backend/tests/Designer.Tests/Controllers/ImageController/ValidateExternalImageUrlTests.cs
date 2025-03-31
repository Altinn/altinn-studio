using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.ImageClient;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using Xunit;

namespace Designer.Tests.Controllers.ImageController;

public class ValidateExternalImageUrlTests
    : DesignerEndpointsTestsBase<ValidateExternalImageUrlTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string VersionPrefix = "designer/api";
    private const string Org = "ttd";
    private const string EmptyApp = "empty-app";
    private const string NotFoundUri = "/notfound";
    private const string ValidNonImageUri = "/index.html";
    private const string ValidImageUri = "/image.png";
    private readonly Altinn.Studio.Designer.Controllers.ImageController _imageController;

    public ValidateExternalImageUrlTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        Mock<IImagesService> imagesService = new();
        Mock<HttpClient> imageClient = new();
        _imageController = new(imagesService.Object, new ImageClient(imageClient.Object));
    }

    [Fact]
    public async Task ValidateExternalImageUrl_WhenUrlIsPointingToAnImage_ReturnsOk()
    {
        MockServerFixture mockServerFixture = new();
        await mockServerFixture.InitializeAsync();
        IRequestBuilder validImageRequest = Request.Create().UsingHead().WithPath(ValidImageUri);
        IResponseBuilder validImageResponse = Response
            .Create()
            .WithSuccess()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Image.Png)
            .WithBody("image");
        mockServerFixture.MockApi.Given(validImageRequest).RespondWith(validImageResponse);

        string urlPointingToImage = mockServerFixture.MockApi.Url + ValidImageUri;
        string path = $"{VersionPrefix}/{Org}/{EmptyApp}/images/validate?url={urlPointingToImage}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string validationResult = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ImageUrlValidationResult.Ok.ToString(), validationResult.Trim('"'));
        await mockServerFixture.DisposeAsync();
    }

    [Fact]
    public async Task ValidateExternalImageUrl_WhenUrlIsNotFound_ReturnsNotFound()
    {
        string path =
            $"{VersionPrefix}/{Org}/{EmptyApp}/images/validate?url=http://localhost:38929/notvalidurl";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string validationResult = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ImageUrlValidationResult.NotValidUrl.ToString(), validationResult.Trim('"'));
    }

    [Fact]
    [UseSystemTextJson]
    public async Task ValidateExternalImageUrl_WhenUrlIsNotPointingToAnImage_ReturnsUnsupportedMediaType()
    {
        MockServerFixture mockServerFixture = new();
        await mockServerFixture.InitializeAsync();
        IRequestBuilder validNonImageRequest = Request
            .Create()
            .UsingHead()
            .WithPath(ValidNonImageUri);
        IResponseBuilder validNonImageResponse = Response
            .Create()
            .WithStatusCode(200)
            .WithHeader("content-type", MediaTypeNames.Text.Html);
        mockServerFixture.MockApi.Given(validNonImageRequest).RespondWith(validNonImageResponse);

        string urlPointingToNonImage = mockServerFixture.MockApi.Url + ValidNonImageUri;
        string path =
            $"{VersionPrefix}/{Org}/{EmptyApp}/images/validate?url={urlPointingToNonImage}";

        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string validationResult = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ImageUrlValidationResult.NotAnImage.ToString(), validationResult.Trim('"'));
        await mockServerFixture.DisposeAsync();
    }
}
