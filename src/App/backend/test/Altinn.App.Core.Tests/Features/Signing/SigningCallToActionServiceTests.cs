using Altinn.App.Core.Configuration;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Correspondence;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Features.Signing;

public class SigningCallToActionServiceTests(ITestOutputHelper output)
{
    private readonly IOptions<GeneralSettings> _generalSettings = Microsoft.Extensions.Options.Options.Create(
        new GeneralSettings()
    );

    private static OrganisationNumber GetOrgNumber(int index) =>
        IdentificationNumberProvider.OrganisationNumbers.GetValidNumber(index);

    private static NationalIdentityNumber GetSsn(int index) =>
        IdentificationNumberProvider.NationalIdentityNumbers.GetValidNumber(index);

    private SigningCallToActionService SetupService(
        Mock<ICorrespondenceClient>? correspondenceClientMockOverride = null,
        Mock<IHostEnvironment>? hostEnvironmentMockOverride = null,
        Mock<IAppMetadata>? appMetadataMockOverride = null,
        Mock<IProfileClient>? profileClientMockOverride = null,
        ITranslationService? translationServiceOverride = null
    )
    {
        Mock<ICorrespondenceClient> correspondenceClientMock = correspondenceClientMockOverride ?? new();
        Mock<IHostEnvironment> hostEnvironmentMock = hostEnvironmentMockOverride ?? new();
        Mock<IAppMetadata> appMetadataMock = appMetadataMockOverride ?? new();
        Mock<ITranslationService> translationServiceMock = new();
        Mock<IProfileClient> profileClientMock = profileClientMockOverride ?? new();
        return new SigningCallToActionService(
            correspondenceClientMock.Object,
            hostEnvironmentMock.Object,
            appMetadataMock.Object,
            profileClientMock.Object,
            translationServiceOverride ?? translationServiceMock.Object,
            FakeLoggerXunit.Get<SigningCallToActionService>(output),
            _generalSettings
        );
    }

    private Mock<IAppResources> SetupAppResourcesMock(
        TextResource? textResourceOverride = null,
        List<TextResourceElement>? additionalTextResourceElements = null
    )
    {
        Mock<IAppResources> appResourcesMock = new();
        TextResource textResource = textResourceOverride ?? new TextResource { Resources = [] };
        textResource.Resources.AddRange(additionalTextResourceElements ?? []);
        appResourcesMock
            .Setup(m => m.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(textResource);
        return appResourcesMock;
    }

    /// <summary>
    /// Test case: SendSignCallToAction with SMS notification configured.
    /// Expected: SMS used, CorrespondenceClient is called with correct parameters.
    /// </summary>
    [Fact]
    public async Task SendSignCallToAction_SmsNotificationConfigured_CallsCorrespondenceClientWithCorrectParameters()
    {
        // Arrange
        string smsContentTextResourceKey = "signing.sms_content";
        SendCorrespondencePayload? capturedPayload = null;
        Mock<ICorrespondenceClient> correspondenceClientMock = new();
        correspondenceClientMock
            .Setup(m => m.Send(It.IsAny<SendCorrespondencePayload>(), It.IsAny<CancellationToken>()))
            .Callback<SendCorrespondencePayload, CancellationToken>((payload, token) => capturedPayload = payload);
        List<TextResourceElement> textResources =
        [
            new TextResourceElement { Id = smsContentTextResourceKey, Value = "Custom sms content" },
        ];
        Mock<IAppResources> appResourcesMock = SetupAppResourcesMock(additionalTextResourceElements: textResources);
        Mock<IHostEnvironment> hostEnvironmentMock = new();
        hostEnvironmentMock.Setup(m => m.EnvironmentName).Returns("tt02");
        ApplicationMetadata applicationMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.Nb, "TestAppName" } },
        };
        Mock<IAppMetadata> appMetadataMock = new();
        appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        AppIdentifier appIdentifier = new("org", "app");
        TranslationService translationService = new(
            appIdentifier,
            appResourcesMock.Object,
            FakeLoggerXunit.Get<TranslationService>(output),
            appMetadataMock.Object
        );

        SigningCallToActionService service = SetupService(
            correspondenceClientMockOverride: correspondenceClientMock,
            translationServiceOverride: translationService,
            appMetadataMockOverride: appMetadataMock,
            hostEnvironmentMockOverride: hostEnvironmentMock
        );

        CommunicationConfig communicationConfig = new()
        {
            Notification = new Notification
            {
                Sms = new Sms { MobileNumber = "12345678", BodyTextResourceKey = smsContentTextResourceKey },
            },
            NotificationChoice = NotificationChoice.Sms,
        };

        InstanceIdentifier instanceIdentifier = new(123, Guid.Parse("ab0cdeb5-dc5e-4faa-966b-d18bb932ca07"));

        var orgNo = GetOrgNumber(1);
        var ssn = GetSsn(1);

        Party signingParty = new() { Name = "Signee", SSN = ssn };
        Party serviceOwnerParty = new() { Name = "Service owner", OrgNumber = orgNo };
        List<AltinnEnvironmentConfig> correspondenceResources =
        [
            new() { Environment = "tt02", Value = "app_ttd_appname" },
        ];

        // Act
        await service.SendSignCallToAction(
            communicationConfig,
            appIdentifier,
            instanceIdentifier,
            signingParty,
            serviceOwnerParty,
            correspondenceResources,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(capturedPayload);
        Assert.Equal(
            CorrespondenceNotificationChannel.Sms,
            capturedPayload.CorrespondenceRequest.Notification!.NotificationChannel
        );
        Assert.Equal("Custom sms content", capturedPayload.CorrespondenceRequest.Notification.SmsBody);
        Assert.Null(capturedPayload.CorrespondenceRequest.Notification.EmailBody);
        Assert.Null(capturedPayload.CorrespondenceRequest.Notification.EmailSubject);
        Assert.Equal("app_ttd_appname", capturedPayload.CorrespondenceRequest.ResourceId);
        Assert.Equal(orgNo.ToString(), capturedPayload.CorrespondenceRequest.Sender.ToString());
        Assert.IsType<OrganisationOrPersonIdentifier.Person>(capturedPayload.CorrespondenceRequest.Recipients[0]);
        Assert.True(ssn == capturedPayload.CorrespondenceRequest.Recipients[0]);
    }

    /// <summary>
    /// Test case: SendSignCallToAction with Email notification configured.
    /// Expected: Email used, CorrespondenceClient is called with correct parameters.
    /// </summary>
    [Fact]
    public async Task SendSignCallToAction_EmailNotificationConfigured_CallsCorrespondenceClientWithCorrectParameters()
    {
        // Arrange
        SendCorrespondencePayload? capturedPayload = null;
        Mock<ICorrespondenceClient> correspondenceClientMock = new();
        correspondenceClientMock
            .Setup(m => m.Send(It.IsAny<SendCorrespondencePayload>(), It.IsAny<CancellationToken>()))
            .Callback<SendCorrespondencePayload, CancellationToken>((payload, token) => capturedPayload = payload);
        List<TextResourceElement> textResources =
        [
            new() { Id = "signing.email_subject", Value = "Custom email subject" },
            new() { Id = "signing.email_content", Value = "Custom email content" },
        ];
        Mock<IAppResources> appResourcesMock = SetupAppResourcesMock(additionalTextResourceElements: textResources);
        Mock<IHostEnvironment> hostEnvironmentMock = new();
        hostEnvironmentMock.Setup(m => m.EnvironmentName).Returns("tt02");
        ApplicationMetadata applicationMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.Nb, "TestAppName" } },
        };
        Mock<IAppMetadata> appMetadataMock = new();
        appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        AppIdentifier appIdentifier = new("org", "app");
        TranslationService translationService = new(
            appIdentifier,
            appResourcesMock.Object,
            FakeLoggerXunit.Get<TranslationService>(output),
            appMetadataMock.Object
        );

        SigningCallToActionService service = SetupService(
            correspondenceClientMockOverride: correspondenceClientMock,
            translationServiceOverride: translationService,
            appMetadataMockOverride: appMetadataMock,
            hostEnvironmentMockOverride: hostEnvironmentMock
        );

        CommunicationConfig communicationConfig = new()
        {
            Notification = new()
            {
                Email = new Email
                {
                    EmailAddress = "my.email@test.no",
                    BodyTextResourceKey = "signing.email_content",
                    SubjectTextResourceKey = "signing.email_subject",
                },
            },
        };
        InstanceIdentifier instanceIdentifier = new(123, Guid.Parse("ab0cdeb5-dc5e-4faa-966b-d18bb932ca07"));

        var orgNo = GetOrgNumber(10);
        var ssn = GetSsn(10);

        Party signingParty = new() { Name = "Signee", SSN = ssn };
        Party serviceOwnerParty = new() { Name = "Service owner", OrgNumber = orgNo };
        List<AltinnEnvironmentConfig> correspondenceResources =
        [
            new() { Environment = "tt02", Value = "app_ttd_appname" },
        ];

        // Act
        await service.SendSignCallToAction(
            communicationConfig,
            appIdentifier,
            instanceIdentifier,
            signingParty,
            serviceOwnerParty,
            correspondenceResources,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(capturedPayload);
        Assert.Equal(
            CorrespondenceNotificationChannel.Email,
            capturedPayload.CorrespondenceRequest.Notification!.NotificationChannel
        );
        Assert.Null(capturedPayload.CorrespondenceRequest.Notification.SmsBody);
        Assert.Equal("Custom email content", capturedPayload.CorrespondenceRequest.Notification.EmailBody);
        Assert.Equal("Custom email subject", capturedPayload.CorrespondenceRequest.Notification.EmailSubject);
        Assert.Equal("app_ttd_appname", capturedPayload.CorrespondenceRequest.ResourceId);
        Assert.Equal(orgNo.ToString(), capturedPayload.CorrespondenceRequest.Sender.ToString());
        Assert.IsType<OrganisationOrPersonIdentifier.Person>(capturedPayload.CorrespondenceRequest.Recipients[0]);
        Assert.True(ssn == capturedPayload.CorrespondenceRequest.Recipients[0]);
    }

    /// <summary>
    /// Test case: SendSignCallToAction with both Email and SMS notification configured.
    /// Expected: Email is preferred, CorrespondenceClient is called with correct parameters.
    /// </summary>
    [Fact]
    public async Task SendSignCallToAction_AllCustomcommunicationConfig_CallsCorrespondenceClientWithCorrectParameters()
    {
        // Arrange
        SendCorrespondencePayload? capturedPayload = null;
        Mock<ICorrespondenceClient> correspondenceClientMock = new();
        correspondenceClientMock
            .Setup(m => m.Send(It.IsAny<SendCorrespondencePayload>(), It.IsAny<CancellationToken>()))
            .Callback<SendCorrespondencePayload, CancellationToken>((payload, token) => capturedPayload = payload);
        List<TextResourceElement> textResources =
        [
            new() { Id = "signing.sms_content", Value = "Custom sms content" },
            new() { Id = "signing.email_subject", Value = "Custom email subject" },
            new() { Id = "signing.email_content", Value = "Custom email content" },
            new() { Id = "signing.inbox_title", Value = "Custom inbox title" },
            new()
            {
                Id = "signing.inbox_content",
                Value =
                    "Custom inbox body with replacement for instance url here: $instanceUrl$, and some more text after, and the deprecated $InstanceUrl",
            },
            new() { Id = "signing.inbox_summary", Value = "Custom inbox summary" },
        ];
        Mock<IAppResources> appResourcesMock = SetupAppResourcesMock(additionalTextResourceElements: textResources);
        Mock<IHostEnvironment> hostEnvironmentMock = new();
        hostEnvironmentMock.Setup(m => m.EnvironmentName).Returns("tt02");
        ApplicationMetadata applicationMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.Nb, "TestAppName" } },
        };
        Mock<IAppMetadata> appMetadataMock = new();
        appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        AppIdentifier appIdentifier = new("org", "app");
        TranslationService translationService = new(
            appIdentifier,
            appResourcesMock.Object,
            FakeLoggerXunit.Get<TranslationService>(output),
            appMetadataMock.Object
        );

        SigningCallToActionService service = SetupService(
            correspondenceClientMockOverride: correspondenceClientMock,
            translationServiceOverride: translationService,
            appMetadataMockOverride: appMetadataMock,
            hostEnvironmentMockOverride: hostEnvironmentMock
        );

        CommunicationConfig communicationConfig = new()
        {
            InboxMessage = new InboxMessage
            {
                TitleTextResourceKey = "signing.inbox_title",
                BodyTextResourceKey = "signing.inbox_content",
                SummaryTextResourceKey = "signing.inbox_summary",
            },
            Notification = new()
            {
                Sms = new Sms { MobileNumber = "12345678", BodyTextResourceKey = "signing.sms_content" },
                Email = new Email
                {
                    EmailAddress = "my.email@test.no",
                    BodyTextResourceKey = "signing.email_content",
                    SubjectTextResourceKey = "signing.email_subject",
                },
            },
            NotificationChoice = NotificationChoice.EmailPreferred,
        };
        InstanceIdentifier instanceIdentifier = new(123, Guid.Parse("ab0cdeb5-dc5e-4faa-966b-d18bb932ca07"));

        var orgNo = GetOrgNumber(4);
        var ssn = GetSsn(8);

        Party signingParty = new() { Name = "Signee", SSN = ssn };
        Party serviceOwnerParty = new() { Name = "Service owner", OrgNumber = orgNo };
        List<AltinnEnvironmentConfig> correspondenceResources =
        [
            new() { Environment = "tt02", Value = "app_ttd_appname" },
        ];

        // Act
        await service.SendSignCallToAction(
            communicationConfig,
            appIdentifier,
            instanceIdentifier,
            signingParty,
            serviceOwnerParty,
            correspondenceResources,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(capturedPayload);
        Assert.Equal(
            CorrespondenceNotificationChannel.EmailPreferred,
            capturedPayload.CorrespondenceRequest.Notification!.NotificationChannel
        );
        Assert.Equal("Custom sms content", capturedPayload.CorrespondenceRequest.Notification.SmsBody);
        Assert.Equal("Custom email content", capturedPayload.CorrespondenceRequest.Notification.EmailBody);
        Assert.Equal("Custom email subject", capturedPayload.CorrespondenceRequest.Notification.EmailSubject);
        Assert.Equal("Custom inbox title", capturedPayload.CorrespondenceRequest.Content.Title);
        Assert.Equal("Custom inbox summary", capturedPayload.CorrespondenceRequest.Content.Summary);
        Assert.Equal(
            "Custom inbox body with replacement for instance url here: [Klikk her for å åpne skjema](http://local.altinn.cloud/org/app/#/instance/123/ab0cdeb5-dc5e-4faa-966b-d18bb932ca07), and some more text after, and the deprecated [Klikk her for å åpne skjema](http://local.altinn.cloud/org/app/#/instance/123/ab0cdeb5-dc5e-4faa-966b-d18bb932ca07)",
            capturedPayload.CorrespondenceRequest.Content.Body
        );
        Assert.Equal("app_ttd_appname", capturedPayload.CorrespondenceRequest.ResourceId);
        Assert.Equal(orgNo, capturedPayload.CorrespondenceRequest.Sender);
        Assert.IsType<OrganisationOrPersonIdentifier.Person>(capturedPayload.CorrespondenceRequest.Recipients[0]);
        Assert.True(ssn == capturedPayload.CorrespondenceRequest.Recipients[0]);
    }

    /// <summary>
    /// Test case: SendSignCallToAction with no notification configured.
    /// Expected: Email with default text used. CorrespondenceClient is called with correct parameters.
    /// </summary>
    [Fact]
    public async Task SendSignCallToAction_NotificationNotConfigured_CallsCorrespondenceClientWithCorrectParameters()
    {
        // Arrange
        SendCorrespondencePayload? capturedPayload = null;
        Mock<ICorrespondenceClient> correspondenceClientMock = new();
        correspondenceClientMock
            .Setup(m => m.Send(It.IsAny<SendCorrespondencePayload>(), It.IsAny<CancellationToken>()))
            .Callback<SendCorrespondencePayload, CancellationToken>((payload, token) => capturedPayload = payload);
        Mock<IAppResources> appResourcesMock = SetupAppResourcesMock();
        Mock<IHostEnvironment> hostEnvironmentMock = new();
        hostEnvironmentMock.Setup(m => m.EnvironmentName).Returns("tt02");
        ApplicationMetadata applicationMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.Nb, "TestAppName" } },
        };
        Mock<IAppMetadata> appMetadataMock = new();
        appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        AppIdentifier appIdentifier = new("org", "app");
        TranslationService translationService = new(
            appIdentifier,
            appResourcesMock.Object,
            FakeLoggerXunit.Get<TranslationService>(output),
            appMetadataMock.Object
        );

        SigningCallToActionService service = SetupService(
            correspondenceClientMockOverride: correspondenceClientMock,
            translationServiceOverride: translationService,
            appMetadataMockOverride: appMetadataMock,
            hostEnvironmentMockOverride: hostEnvironmentMock
        );

        CommunicationConfig communicationConfig = new() { Notification = new() { } };
        InstanceIdentifier instanceIdentifier = new(123, Guid.Parse("ab0cdeb5-dc5e-4faa-966b-d18bb932ca07"));

        var orgNo = GetOrgNumber(1);
        var ssn = GetSsn(1);

        Party signingParty = new() { Name = "Signee", SSN = ssn };
        Party serviceOwnerParty = new() { Name = "Service owner", OrgNumber = orgNo };
        List<AltinnEnvironmentConfig> correspondenceResources =
        [
            new() { Environment = "tt02", Value = "app_ttd_appname" },
        ];

        // Act
        await service.SendSignCallToAction(
            communicationConfig,
            appIdentifier,
            instanceIdentifier,
            signingParty,
            serviceOwnerParty,
            correspondenceResources,
            CancellationToken.None
        );

        // Assert
        Assert.NotNull(capturedPayload);
        Assert.Equal(
            CorrespondenceNotificationChannel.Email,
            capturedPayload.CorrespondenceRequest.Notification!.NotificationChannel
        );
        Assert.Null(capturedPayload.CorrespondenceRequest.Notification.SmsBody);
        Assert.Equal(
            "Din signatur ventes for TestAppName. Åpne Altinn-innboksen din for å fortsette.\n\nHvis du lurer på noe, kan du kontakte Service owner.",
            capturedPayload.CorrespondenceRequest.Notification.EmailBody
        );
        Assert.Equal(
            "TestAppName: Oppgave til signering",
            capturedPayload.CorrespondenceRequest.Notification.EmailSubject
        );
        Assert.Equal("TestAppName: Oppgave til signering", capturedPayload.CorrespondenceRequest.Content.Title);
        Assert.Equal("Din signatur ventes for TestAppName.", capturedPayload.CorrespondenceRequest.Content.Summary);
        Assert.Equal(
            "Du har en oppgave som venter på din signatur. [Klikk her for å åpne skjema](http://local.altinn.cloud/org/app/#/instance/123/ab0cdeb5-dc5e-4faa-966b-d18bb932ca07)\n\nHvis du lurer på noe, kan du kontakte Service owner.",
            capturedPayload.CorrespondenceRequest.Content.Body
        );
        Assert.Equal("app_ttd_appname", capturedPayload.CorrespondenceRequest.ResourceId);
        Assert.Equal(orgNo, capturedPayload.CorrespondenceRequest.Sender.ToString());
        Assert.IsType<OrganisationOrPersonIdentifier.Person>(capturedPayload.CorrespondenceRequest.Recipients[0]);
        Assert.True(ssn == capturedPayload.CorrespondenceRequest.Recipients[0]);
    }

    /// <summary>
    /// Test case: resource for correspondence not found.
    /// Expected: Exception thrown.
    /// </summary>
    /// <returns></returns>
    [Fact]
    public async Task SendSignCallToAction_ResourceNotFound_ThrowsException()
    {
        // Arrange
        Mock<ICorrespondenceClient> correspondenceClientMock = new();
        Mock<IAppResources> appResourcesMock = new();
        appResourcesMock
            .Setup(m => m.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new TextResource());
        Mock<IHostEnvironment> hostEnvironmentMock = new();
        hostEnvironmentMock.Setup(m => m.EnvironmentName).Returns("tt02");
        ApplicationMetadata applicationMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.Nb, "TestAppName" } },
        };
        Mock<IAppMetadata> appMetadataMock = new();
        appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        AppIdentifier appIdentifier = new("org", "app");
        TranslationService translationService = new(
            appIdentifier,
            appResourcesMock.Object,
            FakeLoggerXunit.Get<TranslationService>(output),
            appMetadataMock.Object
        );

        SigningCallToActionService service = SetupService(
            correspondenceClientMockOverride: correspondenceClientMock,
            translationServiceOverride: translationService,
            appMetadataMockOverride: appMetadataMock,
            hostEnvironmentMockOverride: hostEnvironmentMock
        );

        CommunicationConfig communicationConfig = new() { Notification = new Notification { } };
        InstanceIdentifier instanceIdentifier = new(123, Guid.Parse("ab0cdeb5-dc5e-4faa-966b-d18bb932ca07"));
        Party signingParty = new() { Name = "Signee", SSN = GetSsn(1) };
        Party serviceOwnerParty = new() { Name = "Service owner", OrgNumber = GetOrgNumber(1) };
        List<AltinnEnvironmentConfig> correspondenceResources =
        [
            // No resource for tt02 - should throw exception
        ];

        // Act & Assert
        await Assert.ThrowsAsync<ConfigurationException>(async () =>
            await service.SendSignCallToAction(
                communicationConfig,
                appIdentifier,
                instanceIdentifier,
                signingParty,
                serviceOwnerParty,
                correspondenceResources,
                CancellationToken.None
            )
        );
    }

    [Fact]
    public async Task GetContent_WithCustomTexts_ReturnsCorrectContent()
    {
        // Arrange
        string smsContentTextResourceKey = "signing.sms_content";
        List<TextResourceElement> smsTextResource =
        [
            new() { Id = smsContentTextResourceKey, Value = "Custom sms content" },
        ];
        Mock<IAppResources> mock = SetupAppResourcesMock(additionalTextResourceElements: smsTextResource);

        CommunicationConfig communicationConfig = new()
        {
            Notification = new Notification
            {
                Sms = new Sms { MobileNumber = "12345678", BodyTextResourceKey = smsContentTextResourceKey },
            },
        };
        AppIdentifier appIdentifier = new("org", "app");
        InstanceIdentifier instanceIdentifier = new(123, Guid.Parse("ab0cdeb5-dc5e-4faa-966b-d18bb932ca07"));
        TranslationService translationService = new(
            appIdentifier,
            mock.Object,
            FakeLoggerXunit.Get<TranslationService>(output),
            appMetadata: null
        );
        SigningCallToActionService service = SetupService(translationServiceOverride: translationService);

        ApplicationMetadata applicationMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.En, "App name" } },
        };
        Party sendersParty = new() { Name = "Sender" };
        string instanceUrl = "https://altinn.local.cloud";
        string language = LanguageConst.En;

        // Act
        ContentWrapper res = await service.GetContent(
            instanceIdentifier,
            applicationMetadata,
            sendersParty,
            instanceUrl,
            language,
            communicationConfig
        );
        string defaultEmailSubjectContains = "Task for signing";
        string defaultEmailBodyContains = "Your signature is requested for";

        // Assert
        Assert.Equal("Custom sms content", res.SmsBody);
        Assert.Contains(defaultEmailSubjectContains, res.EmailSubject);
        Assert.Contains(defaultEmailBodyContains, res.EmailBody);
        Assert.Equal(language, res.CorrespondenceContent.Language);
    }

    [Fact]
    public async Task GetContent_GetTextsThrows_UsesDefaultTexts()
    {
        // Arrange
        Mock<IAppResources> mock = SetupAppResourcesMock();
        mock.Setup(m => m.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception());

        CommunicationConfig communicationConfig = new()
        {
            Notification = new()
            {
                Sms = new Sms { MobileNumber = "12345678", BodyTextResourceKey = "signing.sms_content" },
            },
        };
        AppIdentifier appIdentifier = new("org", "app");
        InstanceIdentifier instanceIdentifier = new(123, Guid.Parse("ab0cdeb5-dc5e-4faa-966b-d18bb932ca07"));
        TranslationService translationService = new(
            appIdentifier,
            mock.Object,
            FakeLoggerXunit.Get<TranslationService>(output)
        );
        SigningCallToActionService service = SetupService(translationServiceOverride: translationService);

        ApplicationMetadata applicationMetadata = new("org/app")
        {
            Title = new Dictionary<string, string> { { LanguageConst.En, "App name" } },
        };
        Party sendersParty = new() { Name = "SenderNameForTest" };
        string instanceUrl = "https://altinn.local.cloud";
        string language = LanguageConst.En;

        // Act
        ContentWrapper res = await service.GetContent(
            instanceIdentifier,
            applicationMetadata,
            sendersParty,
            instanceUrl,
            language,
            communicationConfig
        );

        // Assert
        Assert.Contains("Your signature is requested for", res.SmsBody);
        Assert.Contains("You have a task waiting for your signature.", res.CorrespondenceContent.Body);
        Assert.Contains(instanceUrl, res.CorrespondenceContent.Body);
        Assert.Contains(sendersParty.Name, res.CorrespondenceContent.Body);
    }

    [Theory]
    [InlineData(LanguageConst.En, "Click here to open the form")]
    [InlineData(LanguageConst.Nn, "Klikk her for å opne skjema")]
    [InlineData(LanguageConst.Nb, "Klikk her for å åpne skjema")]
    [InlineData("NotALanguage", "Klikk her for å åpne skjema")]
    public void GetLinkDisplayText(string language, string expected)
    {
        // Arrange & Act
        string result = SigningTextHelper.GetLinkDisplayText(language);

        // Assert
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("You have a task waiting for your signature.", LanguageConst.En)]
    [InlineData("Du har ei oppgåve som ventar på signaturen din.", LanguageConst.Nn)]
    [InlineData("Du har en oppgave som venter på din signatur.", LanguageConst.Nb)]
    [InlineData("Du har en oppgave som venter på din signatur.", "NotALanguage")]
    public void GetDefaultTexts_ReturnsCorrectTexts(string expectedBodyContains, string language)
    {
        // Arrange
        string instanceUrl = "https://altinn.local.cloud";
        string appName = "appName";
        string appOwner = "appOwner";

        // Act
        DefaultTexts result = SigningTextHelper.GetDefaultTexts(instanceUrl, language, appName, appOwner);

        // Assert
        Assert.NotNull(result.SmsBody);
        Assert.NotNull(result.EmailBody);
        Assert.NotNull(result.EmailSubject);
        Assert.Contains(expectedBodyContains, result.Body);
    }
}
