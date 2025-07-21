using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Models;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using Signee = Altinn.App.Core.Internal.Sign.Signee;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.Storage;

public class SignClientTests
{
    private readonly IOptions<PlatformSettings> platformSettingsOptions;
    private readonly Mock<IUserTokenProvider> userTokenProvide;
    private readonly string apiStorageEndpoint = "https://local.platform.altinn.no/api/storage/";

    public SignClientTests()
    {
        platformSettingsOptions = Options.Create(
            new PlatformSettings() { ApiStorageEndpoint = apiStorageEndpoint, SubscriptionKey = "test" }
        );

        userTokenProvide = new Mock<IUserTokenProvider>();
        userTokenProvide.Setup(s => s.GetUserToken()).Returns("dummytoken");
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
        userTokenProvide.Verify(s => s.GetUserToken(), Times.Once);
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
        return new SignClient(platformSettingsOptions, new HttpClient(delegatingHandlerStub), userTokenProvide.Object);
    }
}
