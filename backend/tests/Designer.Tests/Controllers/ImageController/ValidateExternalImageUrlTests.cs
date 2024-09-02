using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Filters;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ImageController;

public class ValidateExternalImageUrlTests : DesignerEndpointsTestsBase<ValidateExternalImageUrlTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string VersionPrefix = "designer/api";
    private const string Org = "ttd";
    private const string EmptyApp = "empty-app";

    public ValidateExternalImageUrlTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task ValidateExternalImageUrl_WhenUrlIsPointingToAnImage_ReturnsOk()
    {
        string urlPointingToImage = "https://img5.custompublish.com/getfile.php/4807754.2665.zq7ukqkamizuiu/Logo+Sogndal.png";
        string path = $"{VersionPrefix}/{Org}/{EmptyApp}/images/validate?url={urlPointingToImage}";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string validationResult = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ImageUrlValidationResult.Ok.ToString(), validationResult.Trim('"'));
    }

    [Fact]
    public async Task ValidateExternalImageUrl_WhenUrlIsNotFound_ReturnsNotFound()
    {
        string unExistingUrl = "https://someNonExistingUrl.com";
        string path = $"{VersionPrefix}/{Org}/{EmptyApp}/images/validate?url={unExistingUrl}";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string validationResult = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ImageUrlValidationResult.NotValidUrl.ToString(), validationResult.Trim('"'));
    }

    [Fact]
    [UseSystemTextJson]
    public async Task ValidateExternalImageUrl_WhenUrlIsNotPointingToAnImage_ReturnsUnsupportedMediaType()
    {
        string urlPointingToSomethingThatIsNotAnImage = "https://vg.no";
        string path = $"{VersionPrefix}/{Org}/{EmptyApp}/images/validate?url={urlPointingToSomethingThatIsNotAnImage}";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, path);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string validationResult = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ImageUrlValidationResult.NotAnImage.ToString(), validationResult.Trim('"'));
    }
}
