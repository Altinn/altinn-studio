using System.Net;
using Altinn.App.Core.Features.Correspondence;
using Altinn.App.Core.Features.Correspondence.Builder;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.Features.Correspondence;

public class CorrespondenceClientTests
{
    private sealed record Fixture(WebApplication App) : IAsyncDisposable
    {
        public Mock<IHttpClientFactory> HttpClientFactoryMock =>
            Mock.Get(App.Services.GetRequiredService<IHttpClientFactory>());

        public Mock<IMaskinportenClient> MaskinportenClientMock =>
            Mock.Get(App.Services.GetRequiredService<IMaskinportenClient>());

        public ICorrespondenceClient CorrespondenceClient => App.Services.GetRequiredService<ICorrespondenceClient>();

        public static Fixture Create()
        {
            var mockHttpClientFactory = new Mock<IHttpClientFactory>();
            var mockMaskinportenClient = new Mock<IMaskinportenClient>();

            var app = AppBuilder.Build(registerCustomAppServices: services =>
            {
                services.AddSingleton(mockHttpClientFactory.Object);
                services.AddSingleton(mockMaskinportenClient.Object);
                services.Configure<MaskinportenSettings>(options =>
                {
                    options.Authority = "https://maskinporten.dev/";
                    options.ClientId = "test-client-id";
                    options.JwkBase64 =
                        "ewogICAgICAicCI6ICItU09GNmp3V0N3b19nSlByTnJhcVNkNnZRckFzRmxZd1VScHQ0NC1BNlRXUnBoaUo4b3czSTNDWGxxUG1LeG5VWDVDcnd6SF8yeldTNGtaaU9zQTMtajhiUE9hUjZ2a3pRSG14YmFkWmFmZjBUckdJajNQUlhxcVdMRHdsZjNfNklDV2gzOFhodXNBeDVZRE0tRm8zZzRLVWVHM2NxMUFvTkJ4NHV6Sy1IRHMiLAogICAgICAia3R5IjogIlJTQSIsCiAgICAgICJxIjogIndwWUlpOVZJLUJaRk9aYUNaUmVhYm4xWElQbW8tbEJIendnc1RCdHVfeUJma1FQeGI1Q1ZnZFFnaVQ4dTR3Tkl4NC0zb2ROdXhsWGZING1Hc25xOWFRaFlRNFEyc2NPUHc5V2dNM1dBNE1GMXNQQXgzUGJLRkItU01RZmZ4aXk2cVdJSmRQSUJ4OVdFdnlseW9XbEhDcGZsUWplT3U2dk43WExsZ3c5T2JhVSIsCiAgICAgICJkIjogIks3Y3pqRktyWUJfRjJYRWdoQ1RQY2JTbzZZdExxelFwTlZleF9HZUhpTmprWmNpcEVaZ3g4SFhYLXpNSi01ZWVjaTZhY1ZjSzhhZzVhQy01Mk84LTU5aEU3SEE2M0FoRzJkWFdmamdQTXhaVE9MbnBheWtZbzNWa0NGNF9FekpLYmw0d2ludnRuTjBPc2dXaVZiTDFNZlBjWEdqbHNTUFBIUlAyaThDajRqX21OM2JVcy1FbVM5UzktSXlia1luYV9oNUMxMEluXy1tWHpsQ2dCNU9FTXFzd2tNUWRZVTBWbHVuWHM3YXlPT0h2WWpQMWFpYml0MEpyay1iWVFHSy1mUVFFVWNZRkFSN1ZLMkxIaUJwU0NvbzBiSjlCQ1BZb196bTVNVnVId21xbzNtdml1Vy1lMnVhbW5xVHpZUEVWRE1lMGZBSkZtcVBGcGVwTzVfcXE2USIsCiAgICAgICJlIjogIkFRQUIiLAogICAgICAidXNlIjogInNpZyIsCiAgICAgICJraWQiOiAiYXNkZjEyMzQiLAogICAgICAicWkiOiAicXpFUUdXOHBPVUgtR2pCaFUwVXNhWWtEM2dWTVJvTF9CbGlRckp4ZTAwY29YeUtIZGVEX2M1bDFDNFFJZzRJSjZPMnFZZ2wyamRnWVNmVHA0S2NDNk1Obm8tSVFiSnlPRDU2Qmo4eVJUUjA5TkZvTGhDUjNhY0xmMkhwTXNKNUlqbTdBUHFPVWlCeW9hVkExRlR4bzYtZGNfZ1NiQjh1ZDI2bFlFRHdsYWMwIiwKICAgICAgImRwIjogInRnTU14N2FFQ0NiQmctY005Vmo0Q2FXbGR0d01LWGxvTFNoWTFlSTJOS3BOTVFKR2JhdWdjTVRHQ21qTk1fblgzTVZ0cHRvMWFPbTMySlhCRjlqc1RHZWtONWJmVGNJbmZsZ3Bsc21uR2pMckNqN0xYTG9wWUxiUnBabF9iNm1JaThuU2ZCQXVQR2hEUzc4UWZfUXhFR1Bxb2h6cEZVTW5UQUxzOVI0Nkk1YyIsCiAgICAgICJhbGciOiAiUlMyNTYiLAogICAgICAiZHEiOiAibE40cF9ha1lZVXpRZTBWdHp4LW1zNTlLLUZ4bzdkQmJqOFhGOWhnSzdENzlQam5SRGJTRTNVWEgtcGlQSzNpSXhyeHFGZkZuVDJfRS15REJIMjBOMmZ4YllwUVZNQnpZc1UtUGQ2OFBBV1Nnd05TU29XVmhwdEdjaTh4bFlfMDJkWDRlbEF6T1ZlOUIxdXBEMjc5cWJXMVdKVG5TQmp4am1LVU5lQjVPdDAwIiwKICAgICAgIm4iOiAidlY3dW5TclNnekV3ZHo0dk8wTnNmWDB0R1NwT2RITE16aDFseUVtU2RYbExmeVYtcUxtbW9qUFI3S2pUU2NDbDI1SFI4SThvWG1mcDhSZ19vbnA0LUlZWW5ZV0RTNngxVlViOVlOQ3lFRTNQQTUtVjlOYzd5ckxxWXpyMTlOSkJmdmhJVEd5QUFVTjFCeW5JeXJ5NFFMbHRYYTRKSTFiLTh2QXNJQ0xyU1dQZDdibWxrOWo3bU1jV3JiWlNIZHNTMGNpVFgzYTc2UXdMb0F2SW54RlhCU0ludXF3ZVhnVjNCZDFQaS1DZGpCR0lVdXVyeVkybEwybmRnVHZUY2tZUTBYeEtGR3lCdDNaMEhJMzRBRFBrVEZneWFMX1F4NFpIZ3d6ZjRhTHBXaHF3OGVWanpPMXlucjJ3OUd4b2dSN1pWUjY3VFI3eUxSS3VrMWdIdFlkUkJ3IgogICAgfQ==";
                });
            });

            return new Fixture(app);
        }

        public async ValueTask DisposeAsync() => await App.DisposeAsync();
    }

    private static class PayloadFactory
    {
        private static readonly Func<Task<JwtToken>> _defaultTokenFactory = async () =>
            await Task.FromResult(
                JwtToken.Parse(
                    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpdHMtYS1tZSJ9.wLLw4Timcl9gnQvA93RgREz-6S5y1UfzI_GYVI_XVDA"
                )
            );

        public static SendCorrespondencePayload Send(
            Func<Task<JwtToken>>? tokenFactory = default,
            CorrespondenceAuthorisation? authorisation = default
        )
        {
            var request = CorrespondenceRequestBuilder
                .Create()
                .WithResourceId("resource-id")
                .WithSender(OrganisationNumber.Parse("991825827"))
                .WithSendersReference("senders-ref")
                .WithRecipient(OrganisationOrPersonIdentifier.Parse("213872702"))
                .WithContent(
                    CorrespondenceContentBuilder
                        .Create()
                        .WithLanguage(LanguageCode<Iso6391>.Parse("en"))
                        .WithTitle("message-title")
                        .WithSummary("message-summary")
                        .WithBody("message-body")
                )
                .Build();

            return authorisation is null
                ? new SendCorrespondencePayload(request, tokenFactory ?? _defaultTokenFactory)
                : new SendCorrespondencePayload(request, authorisation.Value);
        }

        public static GetCorrespondenceStatusPayload GetStatus(
            Func<Task<JwtToken>>? tokenFactory = default,
            CorrespondenceAuthorisation? authorisation = default
        )
        {
            return authorisation is null
                ? new GetCorrespondenceStatusPayload(Guid.NewGuid(), tokenFactory ?? _defaultTokenFactory)
                : new GetCorrespondenceStatusPayload(Guid.NewGuid(), authorisation.Value);
        }
    }

    [Fact]
    public async Task Send_SuccessfulResponse_ReturnsCorrectResponse()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var mockHttpClientFactory = fixture.HttpClientFactoryMock;
        var mockHttpClient = new Mock<HttpClient>();

        var payload = PayloadFactory.Send();
        var responseMessage = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                    "correspondences": [
                        {
                            "correspondenceId": "cf7a4a9f-45ce-46b9-b110-4f263b395842",
                            "status": "Initialized",
                            "recipient": "0192:213872702",
                            "notifications": [
                                {
                                    "orderId": "05119865-6d46-415c-a2d7-65b9cd173e13",
                                    "isReminder": false,
                                    "status": "Success"
                                }
                            ]
                        }
                    ],
                    "attachmentIds": [
                        "25b87c22-e7cc-4c07-95eb-9afa32e3ee7b"
                    ]
                }
                """
            ),
        };

        mockHttpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(mockHttpClient.Object);
        mockHttpClient
            .Setup(c => c.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(responseMessage);

        // Act
        var result = await fixture.CorrespondenceClient.Send(payload);

        // Assert
        Assert.NotNull(result);
        result.AttachmentIds.Should().ContainSingle("25b87c22-e7cc-4c07-95eb-9afa32e3ee7b");
        result.Correspondences.Should().HaveCount(1);
        result.Correspondences[0].CorrespondenceId.Should().Be("cf7a4a9f-45ce-46b9-b110-4f263b395842");
    }

    [Fact]
    public async Task GetStatus_SuccessfulResponse_ReturnsCorrectResponse()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var mockHttpClientFactory = fixture.HttpClientFactoryMock;
        var mockHttpClient = new Mock<HttpClient>();

        var payload = PayloadFactory.GetStatus();
        var responseMessage = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """
                {
                    "statusHistory": [
                        {
                            "status": "Published",
                            "statusText": "Published"
                        }
                    ],
                    "recipient": "urn:altinn:organization:identifier-no:213872702",
                    "correspondenceId": "94fa9dd9-734e-4712-9d49-4018aeb1a5dc",
                    "resourceId": "test-resource-id",
                    "sender": "urn:altinn:organization:identifier-no:991825827",
                    "sendersReference": "1234",
                    "isConfirmationNeeded": true
                }
                """
            ),
        };

        mockHttpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(mockHttpClient.Object);
        mockHttpClient
            .Setup(c => c.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(responseMessage);

        // Act
        var result = await fixture.CorrespondenceClient.GetStatus(payload);

        // Assert
        Assert.NotNull(result);
        result.StatusHistory.Should().HaveCount(1);
        result.StatusHistory.First().Status.Should().Be(CorrespondenceStatus.Published);
        result.Recipient.Should().Be("urn:altinn:organization:identifier-no:213872702");
        result.CorrespondenceId.Should().Be(Guid.Parse("94fa9dd9-734e-4712-9d49-4018aeb1a5dc"));
        result.ResourceId.Should().Be("test-resource-id");
        result.Sender.Should().Be(OrganisationNumber.Parse("991825827"));
        result.SendersReference.Should().Be("1234");
        result.IsConfirmationNeeded.Should().BeTrue();
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.InternalServerError)]
    public async Task FailedResponse_ThrowsCorrespondenceRequestException(HttpStatusCode httpStatusCode)
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var mockHttpClientFactory = fixture.HttpClientFactoryMock;
        var mockHttpClient = new Mock<HttpClient>();
        var responseMessage = new HttpResponseMessage(httpStatusCode)
        {
            Content = httpStatusCode switch
            {
                HttpStatusCode.BadRequest => new StringContent(
                    """
                    {
                        "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                        "title": "Bad Request",
                        "status": 400,
                        "detail": "For upload requests at least one attachment has to be included",
                        "traceId": "00-3ceaba074547008ac46f622fd67d6c6e-e4129c2b46370667-00"
                    }
                    """
                ),
                _ => null,
            },
        };

        mockHttpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(mockHttpClient.Object);
        mockHttpClient
            .Setup(c => c.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(responseMessage);

        // Act
        Func<Task> send = async () =>
        {
            await fixture.CorrespondenceClient.Send(PayloadFactory.Send());
        };
        Func<Task> getStatus = async () =>
        {
            await fixture.CorrespondenceClient.GetStatus(PayloadFactory.GetStatus());
        };

        // Assert
        await send.Should().ThrowAsync<CorrespondenceRequestException>();
        await getStatus.Should().ThrowAsync<CorrespondenceRequestException>();
    }

    [Fact]
    public async Task KnownCorrespondenceException_IsHandled()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var mockHttpClientFactory = fixture.HttpClientFactoryMock;
        var mockHttpClient = new Mock<HttpClient>();

        mockHttpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(mockHttpClient.Object);
        mockHttpClient
            .Setup(c => c.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
                throw new CorrespondenceRequestException(
                    "Yikes",
                    new CorrespondenceRequestException("Sometimes there's an inner exception")
                )
            );

        // Act
        Func<Task> send = async () =>
        {
            await fixture.CorrespondenceClient.Send(PayloadFactory.Send());
        };
        Func<Task> getStatus = async () =>
        {
            await fixture.CorrespondenceClient.GetStatus(PayloadFactory.GetStatus());
        };

        // Assert
        await send.Should()
            .ThrowAsync<CorrespondenceRequestException>()
            .WithInnerExceptionExactly(typeof(CorrespondenceRequestException));
        await getStatus
            .Should()
            .ThrowAsync<CorrespondenceRequestException>()
            .WithInnerExceptionExactly(typeof(CorrespondenceRequestException));
    }

    [Fact]
    public async Task UnexpectedException_IsHandled()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var mockHttpClientFactory = fixture.HttpClientFactoryMock;
        var mockHttpClient = new Mock<HttpClient>();

        mockHttpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(mockHttpClient.Object);
        mockHttpClient
            .Setup(c => c.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => throw new HttpRequestException("Surprise!"));

        // Act
        Func<Task> send = async () =>
        {
            await fixture.CorrespondenceClient.Send(PayloadFactory.Send());
        };
        Func<Task> getStatus = async () =>
        {
            await fixture.CorrespondenceClient.GetStatus(PayloadFactory.GetStatus());
        };

        // Assert
        await send.Should()
            .ThrowAsync<CorrespondenceRequestException>()
            .WithInnerExceptionExactly(typeof(HttpRequestException));
        await getStatus
            .Should()
            .ThrowAsync<CorrespondenceRequestException>()
            .WithInnerExceptionExactly(typeof(HttpRequestException));
    }

    [Theory]
    [InlineData(typeof(SendCorrespondencePayload), new[] { "altinn:correspondence.write", "altinn:serviceowner" })]
    [InlineData(typeof(GetCorrespondenceStatusPayload), new[] { "altinn:correspondence.write", "altinn:serviceowner" })]
    public async Task AuthorisationFactory_ImplementsMaskinportenCorrectly(
        Type payloadType,
        IEnumerable<string> expectedScopes
    )
    {
        // Arrange
        await using var fixture = Fixture.Create();
        IEnumerable<string>? capturedMaskinportenScopes = null;
        var mockHttpClientFactory = fixture.HttpClientFactoryMock;
        var mockMaskinportenClient = fixture.MaskinportenClientMock;
        var mockHttpClient = new Mock<HttpClient>();
        var correspondencePayload = PayloadFactory.Send(authorisation: CorrespondenceAuthorisation.Maskinporten);
        var altinnTokenResponse = TestAuthentication.GetServiceOwnerToken(org: "ttd");
        var altinnTokenWrapperResponse = JwtToken.Parse(altinnTokenResponse);

        Func<Task<object>> action = async () =>
            payloadType == typeof(SendCorrespondencePayload)
                ? await fixture.CorrespondenceClient.Send(
                    PayloadFactory.Send(authorisation: CorrespondenceAuthorisation.Maskinporten)
                )
                : await fixture.CorrespondenceClient.GetStatus(
                    PayloadFactory.GetStatus(authorisation: CorrespondenceAuthorisation.Maskinporten)
                );

        mockHttpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(mockHttpClient.Object);
        mockMaskinportenClient
            .Setup(m => m.GetAltinnExchangedToken(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<string>, CancellationToken>(
                (scopes, _) =>
                {
                    capturedMaskinportenScopes = scopes;
                }
            )
            .ReturnsAsync(() => altinnTokenWrapperResponse)
            .Verifiable(Times.Once);
        mockHttpClient
            .Setup(c => c.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                (HttpRequestMessage request, CancellationToken _) =>
                    request.RequestUri!.AbsolutePath switch
                    {
                        var path when path.EndsWith("/exchange/maskinporten") => TestHelpers.ResponseMessageFactory(
                            altinnTokenResponse
                        ),
                        var path when path.EndsWith("/correspondence/upload") => TestHelpers.ResponseMessageFactory(
                            "dummy response."
                        ),
                        var path when path.EndsWith("/details") => TestHelpers.ResponseMessageFactory(
                            "dummy response."
                        ),
                        _ => throw FailException.ForFailure($"Unknown mock endpoint: {request.RequestUri}"),
                    }
            );

        // Act
        await action.Should().ThrowAsync<CorrespondenceRequestException>().WithMessage("Invalid response*");

        // Assert
        mockMaskinportenClient.Verify();
        capturedMaskinportenScopes.Should().BeEquivalentTo(expectedScopes);
    }
}
