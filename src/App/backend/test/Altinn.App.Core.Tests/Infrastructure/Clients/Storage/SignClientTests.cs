using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Models;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Signee = Altinn.App.Core.Internal.Sign.Signee;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.Storage;

public class SignClientTests
{
    private readonly IOptions<PlatformSettings> platformSettingsOptions;
    private readonly Mock<IAuthenticationTokenResolver> authenticationTokenResolver;
    private readonly string apiStorageEndpoint = "https://local.platform.altinn.no/api/storage/";

    // Valid JWT format required by JwtToken.Parse
    private const string ValidJwtToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

    public SignClientTests()
    {
        platformSettingsOptions = Options.Create(
            new PlatformSettings() { ApiStorageEndpoint = apiStorageEndpoint, SubscriptionKey = "test" }
        );

        authenticationTokenResolver = new Mock<IAuthenticationTokenResolver>();
        authenticationTokenResolver
            .Setup(s => s.GetAccessToken(It.IsAny<AuthenticationMethod>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(JwtToken.Parse(ValidJwtToken));
    }

    [Fact]
    public async Task SignDataElements_sends_request_to_platform()
    {
        // Arrange
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(1337, Guid.NewGuid());
        HttpRequestMessage? platformRequest = null;
        SignRequest? actualSignRequest = null;
        int callCount = 0;
        SignClient signClient = GetSignClient(
            (request, token) =>
            {
                callCount++;
                platformRequest = request;
                actualSignRequest = JsonSerializerPermissive
                    .DeserializeAsync<SignRequest>(platformRequest!.Content!)
                    .Result;

                return Task.FromResult(new HttpResponseMessage { StatusCode = HttpStatusCode.Created });
            }
        );

        // Act
        var dataElementId = Guid.NewGuid().ToString();
        var signatureContext = new SignatureContext(
            instanceIdentifier,
            "TheTask",
            "sign-data-type",
            new Signee() { UserId = "1337", PersonNumber = "0101011337" },
            new DataElementSignature(dataElementId)
        );

        SignRequest expectedRequest = new SignRequest()
        {
            Signee = new() { UserId = "1337", PersonNumber = "0101011337" },
            DataElementSignatures = new()
            {
                new() { DataElementId = dataElementId, Signed = true },
            },
            SignatureDocumentDataType = "sign-data-type",
            GeneratedFromTask = "TheTask",
        };

        await signClient.SignDataElements(signatureContext);

        // Assert
        authenticationTokenResolver.Verify(
            s => s.GetAccessToken(It.IsAny<AuthenticationMethod>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
        callCount.Should().Be(1);
        platformRequest.Should().NotBeNull();
        platformRequest!.Method.Should().Be(HttpMethod.Post);
        platformRequest!
            .RequestUri!.ToString()
            .Should()
            .Be(
                $"{apiStorageEndpoint}instances/{instanceIdentifier.InstanceOwnerPartyId}/{instanceIdentifier.InstanceGuid}/sign"
            );
        actualSignRequest.Should().BeEquivalentTo(expectedRequest);
    }

    [Fact]
    public async Task SignDataElements_throws_PlatformHttpException_if_platform_returns_http_errorcode()
    {
        // Arrange
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(1337, Guid.NewGuid());
        HttpRequestMessage? platformRequest = null;
        int callCount = 0;
        SignClient signClient = GetSignClient(
            (request, token) =>
            {
                callCount++;
                platformRequest = request;
                return Task.FromResult(new HttpResponseMessage { StatusCode = HttpStatusCode.InternalServerError });
            }
        );

        // Act
        var dataElementId = Guid.NewGuid().ToString();
        var signatureContext = new SignatureContext(
            instanceIdentifier,
            "TheTask",
            "sign-data-type",
            new Signee() { UserId = "1337", PersonNumber = "0101011337" },
            new DataElementSignature(dataElementId)
        );

        var ex = await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await signClient.SignDataElements(signatureContext)
        );
        ex.Should().NotBeNull();
        ex.Response.Should().NotBeNull();
        ex.Response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    private SignClient GetSignClient(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handlerFunc)
    {
        DelegatingHandlerStub delegatingHandlerStub = new(handlerFunc);

        var services = new ServiceCollection();
        services.AddSingleton(platformSettingsOptions);
        services.AddSingleton(authenticationTokenResolver.Object);
        services.AddSingleton<IInstanceLocker>(Mock.Of<IInstanceLocker>());
        var serviceProvider = services.BuildServiceProvider();

        return new SignClient(new HttpClient(delegatingHandlerStub), serviceProvider);
    }
}
