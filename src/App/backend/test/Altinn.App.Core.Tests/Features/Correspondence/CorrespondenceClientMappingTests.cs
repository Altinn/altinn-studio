using System.Net.Mime;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Correspondence;
using Altinn.App.Core.Features.Correspondence.Builder;
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

/// <summary>
/// Tests that <see cref="CorrespondenceClient"/> maps <see cref="CorrespondenceRequest"/> fields correctly
/// to the JSON bodies sent to each Altinn Correspondence API endpoint.
/// </summary>
public class CorrespondenceClientMappingTests
{
    private static string? ReadBody(HttpContent? content)
    {
        if (content is null)
        {
            return null;
        }
        using var reader = new StreamReader(content.ReadAsStream());
        return reader.ReadToEnd();
    }

    [Fact]
    public async Task Send_WithAllOptionalFields_MapsCorrectlyToInitCorrespondenceJson()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var mockHttpClient = new Mock<HttpClient>();

        string? capturedJson = null;
        var existingAttachmentId = Guid.NewGuid();
        var orgSender = TestHelpers.GetOrganisationNumber(0);
        var orgRecipient = TestHelpers.GetOrganisationNumber(1);
        var ninRecipient = TestHelpers.GetNationalIdentityNumber(0);
        var requestedPublishTime = DateTimeOffset.UtcNow.AddDays(1);
        var dueDateTime = DateTimeOffset.UtcNow.AddDays(2);

        var request = CorrespondenceRequestBuilder
            .Create()
            .WithResourceId("resource-id")
            .WithSender(orgSender)
            .WithSendersReference("senders-ref")
            .WithRecipients([
                OrganisationOrPersonIdentifier.Create(orgRecipient),
                OrganisationOrPersonIdentifier.Create(ninRecipient),
            ])
            .WithContent(
                CorrespondenceContentBuilder
                    .Create()
                    .WithLanguage(LanguageCode<Iso6391>.Parse("nb"))
                    .WithTitle("message-title")
                    .WithSummary("message-summary")
                    .WithBody("message-body")
            )
            .WithMessageSender("message-sender")
            .WithRequestedPublishTime(requestedPublishTime)
            .WithDueDateTime(dueDateTime)
            .WithIgnoreReservation(true)
            .WithIsConfirmationNeeded(true)
            .WithIsConfidential(true)
            .WithPropertyList(
                new Dictionary<string, string> { ["prop-key-1"] = "prop-value-1", ["prop-key-2"] = "prop-value-2" }
            )
            .WithExternalReference(CorrespondenceReferenceType.AltinnAppInstance, "ref-value-1")
            .WithExternalReference(CorrespondenceReferenceType.Generic, "ref-value-2")
            .WithReplyOption("https://example.com/1", "Link text 1")
            .WithReplyOption("https://example.com/2", "Link text 2")
            .WithNotification(
                CorrespondenceNotificationBuilder
                    .Create()
                    .WithNotificationTemplate(CorrespondenceNotificationTemplate.CustomMessage)
                    .WithEmailSubject("email-subject")
                    .WithEmailBody("email-body")
                    .WithSmsBody("sms-body")
                    .WithSendReminder(true)
                    .WithReminderEmailSubject("reminder-email-subject")
                    .WithReminderEmailBody("reminder-email-body")
                    .WithReminderSmsBody("reminder-sms-body")
                    .WithNotificationChannel(CorrespondenceNotificationChannel.EmailPreferred)
                    .WithReminderNotificationChannel(CorrespondenceNotificationChannel.SmsPreferred)
                    .WithSendersReference("notification-senders-ref")
                    .WithRecipientOverride(
                        CorrespondenceNotificationOverrideBuilder
                            .Create()
                            .WithEmailAddress("override@example.com")
                            .WithMobileNumber("+4799999999")
                            .Build()
                    )
            )
            .WithExistingAttachment(existingAttachmentId)
            .Build();

        var payload = new SendCorrespondencePayload(request, CorrespondenceAuthenticationMethod.Default());

        fixture.HttpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(mockHttpClient.Object);
        mockHttpClient
            .Setup(c => c.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .Callback(
                (HttpRequestMessage req, CancellationToken _) =>
                {
                    if (req.Method == HttpMethod.Post && req.RequestUri!.AbsolutePath.EndsWith("/correspondence"))
                        capturedJson = ReadBody(req.Content);
                }
            )
            .ReturnsAsync(
                (HttpRequestMessage req, CancellationToken _) =>
                    (req.Method, req.RequestUri!.AbsolutePath) switch
                    {
                        (var m, var path) when m == HttpMethod.Post && path.EndsWith("/correspondence") =>
                            TestHelpers.ResponseMessageFactory(TestHelpers.DummySendCorrespondenceResponse),
                        _ => throw FailException.ForFailure($"Unexpected request: {req.Method} {req.RequestUri}"),
                    }
            );

        // Act
        await fixture.CorrespondenceClient.Send(payload);

        // Assert
        Assert.NotNull(capturedJson);
        using var doc = JsonDocument.Parse(capturedJson);
        var root = doc.RootElement;
        var corr = root.GetProperty("correspondence");

        corr.GetProperty("resourceId").GetString().Should().Be("resource-id");
        corr.GetProperty("sender").GetString().Should().Be(orgSender.ToUrnFormattedString());
        corr.GetProperty("sendersReference").GetString().Should().Be("senders-ref");
        corr.GetProperty("messageSender").GetString().Should().Be("message-sender");
        corr.GetProperty("ignoreReservation").GetBoolean().Should().BeTrue();
        corr.GetProperty("isConfirmationNeeded").GetBoolean().Should().BeTrue();
        corr.GetProperty("isConfidential").GetBoolean().Should().BeTrue();

        var content = corr.GetProperty("content");
        content.GetProperty("language").GetString().Should().Be("nb");
        content.GetProperty("messageTitle").GetString().Should().Be("message-title");
        content.GetProperty("messageSummary").GetString().Should().Be("message-summary");
        content.GetProperty("messageBody").GetString().Should().Be("message-body");

        var recipients = root.GetProperty("recipients");
        recipients.GetArrayLength().Should().Be(2);
        recipients[0].GetString().Should().Be(orgRecipient.ToUrnFormattedString());
        recipients[1].GetString().Should().Be(ninRecipient.ToUrnFormattedString());

        root.GetProperty("existingAttachments")[0].GetGuid().Should().Be(existingAttachmentId);

        var propList = corr.GetProperty("propertyList");
        propList.GetProperty("prop-key-1").GetString().Should().Be("prop-value-1");
        propList.GetProperty("prop-key-2").GetString().Should().Be("prop-value-2");

        var externalRefs = corr.GetProperty("externalReferences");
        externalRefs.GetArrayLength().Should().Be(2);
        externalRefs[0].GetProperty("referenceType").GetString().Should().Be("AltinnAppInstance");
        externalRefs[0].GetProperty("referenceValue").GetString().Should().Be("ref-value-1");
        externalRefs[1].GetProperty("referenceType").GetString().Should().Be("Generic");
        externalRefs[1].GetProperty("referenceValue").GetString().Should().Be("ref-value-2");

        var replyOptions = corr.GetProperty("replyOptions");
        replyOptions.GetArrayLength().Should().Be(2);
        replyOptions[0].GetProperty("linkURL").GetString().Should().Be("https://example.com/1");
        replyOptions[0].GetProperty("linkText").GetString().Should().Be("Link text 1");
        replyOptions[1].GetProperty("linkURL").GetString().Should().Be("https://example.com/2");
        replyOptions[1].GetProperty("linkText").GetString().Should().Be("Link text 2");

        var notification = corr.GetProperty("notification");
        notification.GetProperty("notificationTemplate").GetString().Should().Be("CustomMessage");
        notification.GetProperty("emailSubject").GetString().Should().Be("email-subject");
        notification.GetProperty("emailBody").GetString().Should().Be("email-body");
        notification.GetProperty("smsBody").GetString().Should().Be("sms-body");
        notification.GetProperty("sendReminder").GetBoolean().Should().BeTrue();
        notification.GetProperty("reminderEmailSubject").GetString().Should().Be("reminder-email-subject");
        notification.GetProperty("reminderEmailBody").GetString().Should().Be("reminder-email-body");
        notification.GetProperty("reminderSmsBody").GetString().Should().Be("reminder-sms-body");
        notification.GetProperty("notificationChannel").GetString().Should().Be("EmailPreferred");
        notification.GetProperty("reminderNotificationChannel").GetString().Should().Be("SmsPreferred");
        notification.GetProperty("sendersReference").GetString().Should().Be("notification-senders-ref");

        var customRecipient = notification.GetProperty("customRecipient");
        customRecipient.GetProperty("emailAddress").GetString().Should().Be("override@example.com");
        customRecipient.GetProperty("mobileNumber").GetString().Should().Be("+4799999999");
    }

    [Fact]
    public async Task Send_WithAttachment_InitializesAttachmentWithCorrectFields()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var mockHttpClient = new Mock<HttpClient>();

        string? capturedInitAttachmentJson = null;

        var request = CorrespondenceRequestBuilder
            .Create()
            .WithResourceId("resource-id")
            .WithSender(TestHelpers.GetOrganisationNumber(0))
            .WithSendersReference("senders-ref")
            .WithRecipient(OrganisationOrPersonIdentifier.Create(TestHelpers.GetOrganisationNumber(1)))
            .WithContent(LanguageCode<Iso6391>.Parse("nb"), "title", "summary", "body")
            .WithAttachment(
                CorrespondenceAttachmentBuilder
                    .Create()
                    .WithFilename("test-file.pdf")
                    .WithSendersReference("my-attachment-ref")
                    .WithData(new MemoryStream("content"u8.ToArray()))
                    .WithIsEncrypted(true)
            )
            .Build();

        var payload = new SendCorrespondencePayload(request, CorrespondenceAuthenticationMethod.Default());

        fixture.HttpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(mockHttpClient.Object);
        mockHttpClient
            .Setup(c => c.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .Callback(
                (HttpRequestMessage req, CancellationToken _) =>
                {
                    if (req.Method == HttpMethod.Post && req.RequestUri!.AbsolutePath.EndsWith("/attachment"))
                        capturedInitAttachmentJson = ReadBody(req.Content);
                }
            )
            .ReturnsAsync(
                (HttpRequestMessage req, CancellationToken _) =>
                    (req.Method, req.RequestUri!.AbsolutePath) switch
                    {
                        (var m, var path) when m == HttpMethod.Post && path.EndsWith("/attachment") =>
                            TestHelpers.ResponseMessageFactory(TestHelpers.DummyAttachmentId),
                        (var m, var path) when m == HttpMethod.Post && path.EndsWith("/upload") =>
                            TestHelpers.ResponseMessageFactory(
                                TestHelpers.DummyAttachmentOverviewResponse(
                                    CorrespondenceAttachmentStatusResponse.UploadProcessing
                                )
                            ),
                        (var m, var path) when m == HttpMethod.Get && path.Contains("/attachment/") =>
                            TestHelpers.ResponseMessageFactory(
                                TestHelpers.DummyAttachmentOverviewResponse(
                                    CorrespondenceAttachmentStatusResponse.Published
                                )
                            ),
                        (var m, var path) when m == HttpMethod.Post && path.EndsWith("/correspondence") =>
                            TestHelpers.ResponseMessageFactory(TestHelpers.DummySendCorrespondenceResponse),
                        _ => throw FailException.ForFailure($"Unexpected request: {req.Method} {req.RequestUri}"),
                    }
            );

        // Act
        await fixture.CorrespondenceClient.Send(payload);

        // Assert
        Assert.NotNull(capturedInitAttachmentJson);
        using var doc = JsonDocument.Parse(capturedInitAttachmentJson);
        var root = doc.RootElement;

        root.GetProperty("resourceId").GetString().Should().Be("resource-id");
        root.GetProperty("fileName").GetString().Should().Be("test-file.pdf");
        root.GetProperty("sendersReference").GetString().Should().Be("my-attachment-ref");
        root.GetProperty("isEncrypted").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Send_WithAttachment_AttachmentIdFromInitializeIsUsedInCorrespondenceRequest()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var mockHttpClient = new Mock<HttpClient>();

        string? capturedCorrespondenceJson = null;
        var returnedAttachmentId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

        var request = CorrespondenceRequestBuilder
            .Create()
            .WithResourceId("resource-id")
            .WithSender(TestHelpers.GetOrganisationNumber(0))
            .WithSendersReference("senders-ref")
            .WithRecipient(OrganisationOrPersonIdentifier.Create(TestHelpers.GetOrganisationNumber(1)))
            .WithContent(LanguageCode<Iso6391>.Parse("nb"), "title", "summary", "body")
            .WithAttachment(
                CorrespondenceAttachmentBuilder
                    .Create()
                    .WithFilename("file.txt")
                    .WithSendersReference("file-ref")
                    .WithData(new MemoryStream("data"u8.ToArray()))
            )
            .Build();

        var payload = new SendCorrespondencePayload(request, CorrespondenceAuthenticationMethod.Default());

        fixture.HttpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(mockHttpClient.Object);
        mockHttpClient
            .Setup(c => c.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .Callback(
                (HttpRequestMessage req, CancellationToken _) =>
                {
                    if (req.Method == HttpMethod.Post && req.RequestUri!.AbsolutePath.EndsWith("/correspondence"))
                        capturedCorrespondenceJson = ReadBody(req.Content);
                }
            )
            .ReturnsAsync(
                (HttpRequestMessage req, CancellationToken _) =>
                    (req.Method, req.RequestUri!.AbsolutePath) switch
                    {
                        (var m, var path) when m == HttpMethod.Post && path.EndsWith("/attachment") =>
                            TestHelpers.ResponseMessageFactory(returnedAttachmentId),
                        (var m, var path) when m == HttpMethod.Post && path.EndsWith("/upload") =>
                            TestHelpers.ResponseMessageFactory(
                                TestHelpers.DummyAttachmentOverviewResponse(
                                    CorrespondenceAttachmentStatusResponse.UploadProcessing
                                )
                            ),
                        (var m, var path) when m == HttpMethod.Get && path.Contains("/attachment/") =>
                            TestHelpers.ResponseMessageFactory(
                                TestHelpers.DummyAttachmentOverviewResponse(
                                    CorrespondenceAttachmentStatusResponse.Published
                                )
                            ),
                        (var m, var path) when m == HttpMethod.Post && path.EndsWith("/correspondence") =>
                            TestHelpers.ResponseMessageFactory(TestHelpers.DummySendCorrespondenceResponse),
                        _ => throw FailException.ForFailure($"Unexpected request: {req.Method} {req.RequestUri}"),
                    }
            );

        // Act
        await fixture.CorrespondenceClient.Send(payload);

        // Assert
        Assert.NotNull(capturedCorrespondenceJson);
        using var doc = JsonDocument.Parse(capturedCorrespondenceJson);
        var root = doc.RootElement;

        root.GetProperty("existingAttachments")[0].GetGuid().Should().Be(returnedAttachmentId);
    }

    [Fact]
    public async Task Send_WithExistingAttachments_AreIncludedInCorrespondenceRequest()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var mockHttpClient = new Mock<HttpClient>();

        string? capturedCorrespondenceJson = null;
        var preExistingId1 = Guid.NewGuid();
        var preExistingId2 = Guid.NewGuid();

        var request = CorrespondenceRequestBuilder
            .Create()
            .WithResourceId("resource-id")
            .WithSender(TestHelpers.GetOrganisationNumber(0))
            .WithSendersReference("senders-ref")
            .WithRecipient(OrganisationOrPersonIdentifier.Create(TestHelpers.GetOrganisationNumber(1)))
            .WithContent(LanguageCode<Iso6391>.Parse("nb"), "title", "summary", "body")
            .WithExistingAttachment(preExistingId1)
            .WithExistingAttachment(preExistingId2)
            .Build();

        var payload = new SendCorrespondencePayload(request, CorrespondenceAuthenticationMethod.Default());

        fixture.HttpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(mockHttpClient.Object);
        mockHttpClient
            .Setup(c => c.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .Callback(
                (HttpRequestMessage req, CancellationToken _) =>
                {
                    if (req.Method == HttpMethod.Post && req.RequestUri!.AbsolutePath.EndsWith("/correspondence"))
                        capturedCorrespondenceJson = ReadBody(req.Content);
                }
            )
            .ReturnsAsync(
                (HttpRequestMessage req, CancellationToken _) =>
                    (req.Method, req.RequestUri!.AbsolutePath) switch
                    {
                        (var m, var path) when m == HttpMethod.Post && path.EndsWith("/correspondence") =>
                            TestHelpers.ResponseMessageFactory(TestHelpers.DummySendCorrespondenceResponse),
                        _ => throw FailException.ForFailure($"Unexpected request: {req.Method} {req.RequestUri}"),
                    }
            );

        // Act
        await fixture.CorrespondenceClient.Send(payload);

        // Assert
        Assert.NotNull(capturedCorrespondenceJson);
        using var doc = JsonDocument.Parse(capturedCorrespondenceJson);

        var existingAttachments = doc.RootElement.GetProperty("existingAttachments");
        existingAttachments.GetArrayLength().Should().Be(2);
        existingAttachments
            .EnumerateArray()
            .Select(e => e.GetGuid())
            .Should()
            .BeEquivalentTo([preExistingId1, preExistingId2]);
    }

    [Fact]
    public async Task Send_WithUploadedAndPreExistingAttachments_BothIncludedInCorrespondenceRequest()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var mockHttpClient = new Mock<HttpClient>();

        string? capturedCorrespondenceJson = null;
        var preExistingId = Guid.NewGuid();
        var uploadedId = Guid.Parse("11112222-3333-4444-5555-666677778888");

        var request = CorrespondenceRequestBuilder
            .Create()
            .WithResourceId("resource-id")
            .WithSender(TestHelpers.GetOrganisationNumber(0))
            .WithSendersReference("senders-ref")
            .WithRecipient(OrganisationOrPersonIdentifier.Create(TestHelpers.GetOrganisationNumber(1)))
            .WithContent(LanguageCode<Iso6391>.Parse("nb"), "title", "summary", "body")
            .WithAttachment(
                CorrespondenceAttachmentBuilder
                    .Create()
                    .WithFilename("uploaded.txt")
                    .WithSendersReference("uploaded-ref")
                    .WithData(new MemoryStream("data"u8.ToArray()))
            )
            .WithExistingAttachment(preExistingId)
            .Build();

        var payload = new SendCorrespondencePayload(request, CorrespondenceAuthenticationMethod.Default());

        fixture.HttpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(mockHttpClient.Object);
        mockHttpClient
            .Setup(c => c.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .Callback(
                (HttpRequestMessage req, CancellationToken _) =>
                {
                    if (req.Method == HttpMethod.Post && req.RequestUri!.AbsolutePath.EndsWith("/correspondence"))
                        capturedCorrespondenceJson = ReadBody(req.Content);
                }
            )
            .ReturnsAsync(
                (HttpRequestMessage req, CancellationToken _) =>
                    (req.Method, req.RequestUri!.AbsolutePath) switch
                    {
                        (var m, var path) when m == HttpMethod.Post && path.EndsWith("/attachment") =>
                            TestHelpers.ResponseMessageFactory(uploadedId),
                        (var m, var path) when m == HttpMethod.Post && path.EndsWith("/upload") =>
                            TestHelpers.ResponseMessageFactory(
                                TestHelpers.DummyAttachmentOverviewResponse(
                                    CorrespondenceAttachmentStatusResponse.UploadProcessing
                                )
                            ),
                        (var m, var path) when m == HttpMethod.Get && path.Contains("/attachment/") =>
                            TestHelpers.ResponseMessageFactory(
                                TestHelpers.DummyAttachmentOverviewResponse(
                                    CorrespondenceAttachmentStatusResponse.Published
                                )
                            ),
                        (var m, var path) when m == HttpMethod.Post && path.EndsWith("/correspondence") =>
                            TestHelpers.ResponseMessageFactory(TestHelpers.DummySendCorrespondenceResponse),
                        _ => throw FailException.ForFailure($"Unexpected request: {req.Method} {req.RequestUri}"),
                    }
            );

        // Act
        await fixture.CorrespondenceClient.Send(payload);

        // Assert
        Assert.NotNull(capturedCorrespondenceJson);
        using var doc = JsonDocument.Parse(capturedCorrespondenceJson);

        var existingAttachments = doc.RootElement.GetProperty("existingAttachments");
        existingAttachments.GetArrayLength().Should().Be(2);
        existingAttachments
            .EnumerateArray()
            .Select(e => e.GetGuid())
            .Should()
            .BeEquivalentTo([uploadedId, preExistingId]);
    }

    private sealed record Fixture(WebApplication App) : IAsyncDisposable
    {
        public Mock<IHttpClientFactory> HttpClientFactoryMock =>
            Mock.Get(App.Services.GetRequiredService<IHttpClientFactory>());

        public ICorrespondenceClient CorrespondenceClient => App.Services.GetRequiredService<ICorrespondenceClient>();

        public static Fixture Create()
        {
            var mockHttpClientFactory = new Mock<IHttpClientFactory>(MockBehavior.Strict);
            var mockMaskinportenClient = new Mock<IMaskinportenClient>(MockBehavior.Strict);
            var authenticationContextMock = new Mock<IAuthenticationContext>(MockBehavior.Strict);

            mockMaskinportenClient
                .Setup(m => m.GetAltinnExchangedToken(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
                .Returns((IEnumerable<string> scopes, CancellationToken _) => TestHelpers.OrgTokenFactory(scopes));

            var app = AppBuilder.Build(registerCustomAppServices: services =>
            {
                services.AddSingleton(mockHttpClientFactory.Object);
                services.AddSingleton(mockMaskinportenClient.Object);
                services.AddSingleton(authenticationContextMock.Object);
                services.Configure<PlatformSettings>(_ => { });
                services.Configure<GeneralSettings>(options =>
                {
                    options.HostName = "tt02.altinn.no";
                });
                services.Configure<MaskinportenSettings>(options =>
                {
                    options.Authority = "https://maskinporten.dev/";
                    options.ClientId = "test-client-id";
                    options.JwkBase64 =
                        "ewogICAgICAicCI6ICItU09GNmp3V0N3b19nSlByTnJhcVNkNnZRckFzRmxZd1VScHQ0NC1BNlRXUnBoaUo4b3czSTNDWGxxUG1LeG5VWDVDcnd6SF8yeldTNGtaaU9zQTMtajhiUE9hUjZ2a3pRSG14YmFkWmFmZjBUckdJajNQUlhxcVdMRHdsZjNfNklDV2gzOFhodXNBeDVZRE0tRm8zZzRLVWVHM2NxMUFvTkJ4NHV6Sy1IRHMiLAogICAgICAia3R5IjogIlJTQSIsCiAgICAgICJxIjogIndwWUlpOVZJLUJaRk9aYUNaUmVhYm4xWElQbW8tbEJIendnc1RCdHVfeUJma1FQeGI1Q1ZnZFFnaVQ4dTR3Tkl4NC0zb2ROdXhsWGZING1Hc25xOWFRaFlRNFEyc2NPUHc5V2dNM1dBNE1GMXNQQXgzUGJLRkItU01RZmZ4aXk2cVdJSmRQSUJ4OVdFdnlseW9XbEhDcGZsUWplT3U2dk43WExsZ3c5T2JhVSIsCiAgICAgICJkIjogIks3Y3pqRktyWUJfRjJYRWdoQ1RQY2JTbzZZdExxelFwTlZleF9HZUhpTmprWmNpcEVaZ3g4SFhYLXpNSi01ZWVjaTZhY1ZjSzhhZzVhQy01Mk84LTU5aEU3SEE2M0FoRzJkWFdmamdQTXhaVE9MbnBheWtZbzNWa0NGNF9FekpLYmw0d2ludnRuTjBPc2dXaVZiTDFNZlBjWEdqbHNTUFBIUlAyaThDajRqX21OM2JVcy1FbVM5UzktSXlia1luYV9oNUMxMEluXy1tWHpsQ2dCNU9FTXFzd2tNUWRZVTBWbHVuWHM3YXlPT0h2WWpQMWFpYml0MEpyay1iWVFHSy1mUVFFVWNZRkFSN1ZLMkxIaUJwU0NvbzBiSjlCQ1BZb196bTVNVnVId21xbzNtdml1Vy1lMnVhbW5xVHpZUEVWRE1lMGZBSkZtcVBGcGVwTzVfcXE2USIsCiAgICAgICJlIjogIkFRQUIiLAogICAgICAidXNlIjogInNpZyIsCiAgICAgICJraWQiOiAiYXNkZjEyMzQiLAogICAgICAicWkiOiAicXpFUUdXOHBPVUgtR2pCaFUwVXNhWWtEM2dWTVJvTF9CbGlRckp4ZTAwY29YeUtIZGVEX2M1bDFDNFFJZzRJSjZPMnFZZ2wyamRnWVNmVHA0S2NDNk1Obm8tSVFiSnlPRDU2Qmo4eVJUUjA5TkZvTGhDUjNhY0xmMkhwTXNKNUlqbTdBUHFPVWlCeW9hVkExRlR4bzYtZGNfZ1NiQjh1ZDI2bFlFRHdsYWMwIiwKICAgICAgImRwIjogInRnTU14N2FFQ0NiQmctY005Vmo0Q2FXbGR0d01LWGxvTFNoWTFlSTJOS3BOTVFKR2JhdWdjTVRHQ21qTk1fblgzTVZ0cHRvMWFPbTMySlhCRjlqc1RHZWtONWJmVGNJbmZsZ3Bsc21uR2pMckNqN0xYTG9wWUxiUnBabF9iNm1JaThuU2ZCQXVQR2hEUzc4UWZfUXhFR1Bxb2h6cEZVTW5UQUxzOVI0Nkk1YyIsCiAgICAgICJhbGciOiAiUlMyNTYiLAogICAgICAiZHEiOiAibE40cF9ha1lZVXpRZTBWdHp4LW1zNTlLLUZ4bzdkQmJqOFhGOWhnSzdENzlQam5SREJTRTNVWEgtcGlQSzNpSXhyeHFGZkZuVDJfRS15REJIMjBOMmZ4YllwUVZNQnpZc1UtUGQ2OFBBV1Nnd05TU29XVmhwdEdjaTh4bFlfMDJkWDRlbEF6T1ZlOUIxdXBEMjc5cWJXMVdKVG5TQmp4am1LVU5lQjVPdDAwIiwKICAgICAgIm4iOiAidlY3dW5TclNnekV3ZHo0dk8wTnNmWDB0R1NwT2RITE16aDFseUVtU2RYbExmeVYtcUxtbW9qUFI3S2pUU2NDbDI1SFI4SThvWG1mcDhSZ19vbnA0LUlZWW5ZV0RTNngxVlViOVlOQ3lFRTNQQTUtVjlOYzd5ckxxWXpyMTlOSkJmdmhJVEd5QUFVTjFCeW5JeXJ5NFFMbHRYYTRKSTFiLTh2QXNJQ0xyU1dQZDdibWxrOWo3bU1jV3JiWlNIZHNTMGNpVFgzYTc2UXdMb0F2SW54RlhCU0ludXF3ZVhnVjNCZDFQaS1DZGpCR0lVdXVyeVkybEwybmRnVHZUY2tZUTBYeEtGR3lCdDNaMEhJMzRBRFBrVEZneWFMX1F4NFpIZ3d6ZjRhTHBXaHF3OGVWanpPMXlucjJ3OUd4b2dSN1pWUjY3VFI3eUxSS3VrMWdIdFlkUkJ3IgogICAgfQ==";
                });
            });

            return new Fixture(app);
        }

        public async ValueTask DisposeAsync() => await App.DisposeAsync();
    }
}
