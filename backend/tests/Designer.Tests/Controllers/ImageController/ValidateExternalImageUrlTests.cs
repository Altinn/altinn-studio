using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.ImageClient;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Moq.Protected;
using Xunit;

namespace Designer.Tests.Controllers.ImageController;

public class ValidateExternalImageUrlTests
    : DesignerEndpointsTestsBase<ValidateExternalImageUrlTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string NotFoundUrl = "https://nonexistingurl.no/";
    private const string ValidNonImageUrl = "https://validurl.no/";
    private const string ValidImageUrl = "https://validurl.no/image.png";
    private readonly Altinn.Studio.Designer.Controllers.ImageController _imageController;

    public ValidateExternalImageUrlTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        Mock<IImagesService> imagesService = new();
        Mock<HttpClient> httpClient = new();
        httpClient
            .Setup(x =>
                x.SendAsync(
                    It.Is<HttpRequestMessage>(httpRequestMessage =>
                        httpRequestMessage.RequestUri.AbsoluteUri == ValidImageUrl
                    ),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("", new MediaTypeHeaderValue("image/png")),
                }
            );
        httpClient
            .Setup(x =>
                x.SendAsync(
                    It.Is<HttpRequestMessage>(httpRequestMessage =>
                        httpRequestMessage.RequestUri.AbsoluteUri == NotFoundUrl
                    ),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new HttpResponseMessage(HttpStatusCode.NotFound) { Content = new StringContent("") }
            );
        httpClient
            .Setup(x =>
                x.SendAsync(
                    It.Is<HttpRequestMessage>(httpRequestMessage =>
                        httpRequestMessage.RequestUri.AbsoluteUri == ValidNonImageUrl
                    ),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("") }
            );
        ImageClient imageClient = new(httpClient.Object);
        _imageController = new(imagesService.Object, imageClient);
    }

    [Fact]
    public async Task ValidateExternalImageUrl_WhenUrlIsPointingToAnImage_ReturnsOk()
    {
        string urlPointingToImage = ValidImageUrl;
        ImageUrlValidationResult imageUrlValidationResult =
            await _imageController.ValidateExternalImageUrl(urlPointingToImage);
        Assert.Equal(ImageUrlValidationResult.Ok.ToString(), imageUrlValidationResult.ToString());
    }

    [Fact]
    public async Task ValidateExternalImageUrl_WhenUrlIsNotFound_ReturnsNotFound()
    {
        string unExistingUrl = NotFoundUrl;
        ImageUrlValidationResult imageUrlValidationResult =
            await _imageController.ValidateExternalImageUrl(unExistingUrl);
        Assert.Equal(
            ImageUrlValidationResult.NotValidUrl.ToString(),
            imageUrlValidationResult.ToString()
        );
    }

    [Fact]
    [UseSystemTextJson]
    public async Task ValidateExternalImageUrl_WhenUrlIsNotPointingToAnImage_ReturnsUnsupportedMediaType()
    {
        string urlPointingToSomethingThatIsNotAnImage = ValidNonImageUrl;
        ImageUrlValidationResult imageUrlValidationResult =
            await _imageController.ValidateExternalImageUrl(urlPointingToSomethingThatIsNotAnImage);
        Assert.Equal(
            ImageUrlValidationResult.NotAnImage.ToString(),
            imageUrlValidationResult.ToString()
        );
    }
}
