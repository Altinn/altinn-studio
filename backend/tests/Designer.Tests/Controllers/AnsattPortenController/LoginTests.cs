using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Designer.Tests.Controllers.AnsattPortenController.Base;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AnsattPortenController;

public class LoginTests : AnsattPortenControllerTestsBase<LoginTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix => "/designer/api/ansattporten/login";

    public LoginTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("/test", HttpStatusCode.Redirect)]
    [InlineData("/", HttpStatusCode.Redirect)]
    [InlineData("https://docs.altinn.studio/", HttpStatusCode.Forbidden)]
    public async Task LoginShouldReturn_ExpectedCode(string redirectTo, HttpStatusCode expectedStatusCode)
    {
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get
            , $"{VersionPrefix}?redirect_to={redirectTo}");

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(expectedStatusCode, response.StatusCode);

        if (expectedStatusCode == HttpStatusCode.Redirect)
        {
            Assert.Equal(redirectTo, response.Headers.Location?.ToString());
        }
    }
}
