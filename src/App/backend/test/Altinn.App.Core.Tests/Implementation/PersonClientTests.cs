using System.Net;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Infrastructure.Clients.Register;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Implementation;

public class PersonClientTests
{
    private readonly Mock<IOptions<PlatformSettings>> _platformSettingsOptions;
    private readonly Mock<IAppMetadata> _appMetadata;
    private readonly Mock<IAccessTokenGenerator> _accessTokenGenerator;
    private readonly Mock<IUserTokenProvider> _userTokenProvider;

    public PersonClientTests()
    {
        PlatformSettings platformSettings = new() { ApiRegisterEndpoint = "http://real.domain.com" };
        _platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
        _platformSettingsOptions.Setup(s => s.Value).Returns(platformSettings);

        _appMetadata = new Mock<IAppMetadata>();
        _appMetadata
            .Setup(s => s.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/app") { Org = "ttd", Id = "ttd/app" });

        _accessTokenGenerator = new Mock<IAccessTokenGenerator>();
        _accessTokenGenerator
            .Setup(s => s.GenerateAccessToken(It.Is<string>(org => org == "ttd"), It.Is<string>(app => app == "app")))
            .Returns("accesstoken");

        _userTokenProvider = new Mock<IUserTokenProvider>();
        _userTokenProvider.Setup(s => s.GetUserToken()).Returns("usertoken");
    }

    [Fact]
    public async Task GetPerson_PlatformResponseOk_OutcomeSuccessful()
    {
        // Arrange
        HttpRequestMessage? platformRequest = null;
        DelegatingHandlerStub messageHandler = new(
            async (HttpRequestMessage request, CancellationToken token) =>
            {
                platformRequest = request;
                Person person = new Person { LastName = "Lastname" };
                return await CreateHttpResponseMessage(person);
            }
        );

        var target = new PersonClient(
            new HttpClient(messageHandler),
            _platformSettingsOptions.Object,
            _appMetadata.Object,
            _accessTokenGenerator.Object,
            _userTokenProvider.Object
        );

        // Act
        var actual = await target.GetPerson("personnummer", "lastname", CancellationToken.None);

        // Assert
        _appMetadata.VerifyAll();
        _accessTokenGenerator.VerifyAll();
        _userTokenProvider.VerifyAll();

        Assert.NotNull(platformRequest);

        Assert.Equal(HttpMethod.Get, platformRequest!.Method);
        Assert.Equal("Bearer usertoken", platformRequest!.Headers.Authorization!.ToString());
        Assert.Equal("accesstoken", platformRequest!.Headers.GetValues(General.PlatformAccessTokenHeaderName).First());
        Assert.StartsWith("http://real.domain.com", platformRequest!.RequestUri!.ToString());
        Assert.EndsWith("persons", platformRequest!.RequestUri!.ToString());
        Assert.Equal("personnummer", platformRequest!.Headers.GetValues("X-Ai-NationalIdentityNumber").First());
        Assert.Equal(ConvertToBase64("lastname"), platformRequest!.Headers.GetValues("X-Ai-LastName").First());

        Assert.NotNull(actual);
    }

    [Fact]
    public async Task GetPerson_PlatformResponseNotFound_ReturnsNull()
    {
        // Arrange
        HttpRequestMessage? platformRequest = null;
        DelegatingHandlerStub messageHandler = new(
            async (HttpRequestMessage request, CancellationToken token) =>
            {
                platformRequest = request;
                return await Task.FromResult(new HttpResponseMessage() { StatusCode = HttpStatusCode.NotFound });
            }
        );

        var target = new PersonClient(
            new HttpClient(messageHandler),
            _platformSettingsOptions.Object,
            _appMetadata.Object,
            _accessTokenGenerator.Object,
            _userTokenProvider.Object
        );

        // Act
        var actual = await target.GetPerson("personnummer", "lastname", CancellationToken.None);

        // Assert
        Assert.NotNull(platformRequest);
        Assert.Null(actual);
    }

    [Fact]
    public async Task GetPerson_PlatformResponseTooManyRequests_ThrowsPlatformHttpException()
    {
        // Arrange
        HttpRequestMessage? platformRequest = null;
        DelegatingHandlerStub messageHandler = new(
            async (HttpRequestMessage request, CancellationToken token) =>
            {
                platformRequest = request;
                HttpResponseMessage responseMessage = new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.TooManyRequests,
                };
                return await Task.FromResult(responseMessage);
            }
        );

        var target = new PersonClient(
            new HttpClient(messageHandler),
            _platformSettingsOptions.Object,
            _appMetadata.Object,
            _accessTokenGenerator.Object,
            _userTokenProvider.Object
        );

        PlatformHttpException? actual = null;

        // Act
        try
        {
            _ = await target.GetPerson("personnummer", "lastname", CancellationToken.None);
        }
        catch (PlatformHttpException phe)
        {
            actual = phe;
        }

        // Assert
        Assert.NotNull(platformRequest);
        Assert.NotNull(actual);
        Assert.Equal(HttpStatusCode.TooManyRequests, actual!.Response.StatusCode);
    }

    private static async Task<HttpResponseMessage> CreateHttpResponseMessage(object obj)
    {
        string content = JsonSerializer.Serialize(obj);
        StringContent stringContent = new StringContent(content, Encoding.UTF8, "application/json");
        return await Task.FromResult(new HttpResponseMessage { Content = stringContent });
    }

    private static string ConvertToBase64(string text)
    {
        var bytes = Encoding.UTF8.GetBytes(text);
        return Convert.ToBase64String(bytes);
    }
}
