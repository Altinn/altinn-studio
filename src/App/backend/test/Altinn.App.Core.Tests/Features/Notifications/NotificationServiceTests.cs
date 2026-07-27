using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Notifications;
using Altinn.App.Core.Features.Notifications.SecretProvider;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Features.Notifications;

public class NotificationServiceTests
{
    private readonly Mock<INotificationOrderClient> _orderClientMock = new();
    private readonly Mock<IProfileClient> _profileClientMock = new();
    private readonly Mock<IAltinnCdnClient> _cdnClientMock = new();
    private readonly Mock<IAltinnPartyClient> _partyClientMock = new();
    private readonly Mock<IAppMetadata> _appMetadataMock = new();
    private readonly Mock<ILogger<NotificationService>> _logger = new();
    private readonly Mock<INotificationConditionTokenGenerator> _tokenGenerator = new();

    private NotificationService CreateSut() =>
        new(
            _orderClientMock.Object,
            _tokenGenerator.Object,
            _profileClientMock.Object,
            _cdnClientMock.Object,
            _appMetadataMock.Object,
            _partyClientMock.Object,
            Microsoft.Extensions.Options.Options.Create(new GeneralSettings()),
            _logger.Object
        );

    #region Helpers

    private static Instance CreateTestInstance(
        string appId = "ttd/app",
        string? orgNumber = null,
        string? personNumber = null,
        string? externalIdentifier = null,
        DateTime? dueBefore = null
    ) =>
        new()
        {
            Id = "1337/abc-123",
            AppId = appId,
            DueBefore = dueBefore,
            InstanceOwner = new InstanceOwner
            {
                OrganisationNumber = orgNumber,
                PersonNumber = personNumber,
                ExternalIdentifier = externalIdentifier,
            },
        };

    private static InstantiationNotification DefaultNotification() =>
        new() { NotificationChannel = NotificationChannel.Email };

    private static InstantiationNotification NotificationWithReminders(
        List<InstantiationNotificationReminder>? reminders
    ) => new() { NotificationChannel = NotificationChannel.Email, Reminders = reminders };

    #endregion

    #region SSN

    [Fact]
    public async Task DetermineLanguage_PersonOwner_UsesProfileLanguage()
    {
        const string ssn = "01010112345";
        var instanceOwner = new InstanceOwner { PersonNumber = ssn };

        _profileClientMock
            .Setup(p => p.GetUserProfile(ssn, null))
            .ReturnsAsync(
                new UserProfile
                {
                    ProfileSettingPreference = new ProfileSettingPreference { Language = LanguageConst.En },
                }
            );

        var result = await CreateSut().DetermineLanguage(instanceOwner, requestedOrgLanguage: null);

        Assert.Equal(LanguageConst.En, result);
        _profileClientMock.Verify(p => p.GetUserProfile(ssn, null), Times.Once);
    }

    [Fact]
    public async Task DetermineLanguage_PersonOwner_ProfileLanguageIsNull_FallsBackToNb()
    {
        const string ssn = "01010112345";
        var instanceOwner = new InstanceOwner { PersonNumber = ssn };

        _profileClientMock
            .Setup(p => p.GetUserProfile(ssn, null))
            .ReturnsAsync(
                new UserProfile { ProfileSettingPreference = new ProfileSettingPreference { Language = null } }
            );

        var result = await CreateSut().DetermineLanguage(instanceOwner, requestedOrgLanguage: null);

        Assert.Equal(LanguageConst.Nb, result);
    }

    [Fact]
    public async Task DetermineLanguage_PersonOwner_ProfileIsNull_FallsBackToNb()
    {
        const string ssn = "01010112345";
        var instanceOwner = new InstanceOwner { PersonNumber = ssn };

        UserProfile? profile = null;
        _profileClientMock.Setup(p => p.GetUserProfile(ssn, null)).ReturnsAsync(profile);

        var result = await CreateSut().DetermineLanguage(instanceOwner, requestedOrgLanguage: null);

        Assert.Equal(LanguageConst.Nb, result);
    }

    #endregion

    #region Org number

    [Theory]
    [InlineData(LanguageConst.En, LanguageConst.En)]
    [InlineData(LanguageConst.Nb, LanguageConst.Nb)]
    [InlineData(LanguageConst.Nn, LanguageConst.Nn)]
    [InlineData(null, LanguageConst.Nb)]
    public async Task DetermineLanguage_OrgOwner_UsesRequestedLanguage(
        string? requestedLanguage,
        string expectedLanguage
    )
    {
        var instanceOwner = new InstanceOwner { OrganisationNumber = "123456789" };

        var result = await CreateSut().DetermineLanguage(instanceOwner, requestedOrgLanguage: requestedLanguage);

        Assert.Equal(expectedLanguage, result);
        _profileClientMock.Verify(p => p.GetUserProfile(It.IsAny<string>(), null), Times.Never);
    }

    #endregion

    #region ExternalIdentifier

    [Fact]
    public async Task DetermineLanguage_ExternalIdentifierOwner_PartyUuidMissing_FallsBackToEnglish()
    {
        var instanceOwner = new InstanceOwner { ExternalIdentifier = "ext-user-42" };
        Guid? guid = null;
        _partyClientMock.Setup(p => p.GetPartyUuidByUrn("ext-user-42")).ReturnsAsync(guid);

        var result = await CreateSut().DetermineLanguage(instanceOwner, requestedOrgLanguage: LanguageConst.Nb);

        Assert.Equal(LanguageConst.En, result);
        _partyClientMock.Verify(p => p.GetPartyUuidByUrn("ext-user-42"), Times.Once);
        _profileClientMock.Verify(p => p.GetUserProfile(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DetermineLanguage_ExternalIdentifierOwner_UsesProfileLanguage()
    {
        Guid partyGuid = Guid.NewGuid();
        InstanceOwner instanceOwner = new() { ExternalIdentifier = "ext-user-42" };

        _partyClientMock.Setup(p => p.GetPartyUuidByUrn("ext-user-42")).ReturnsAsync(partyGuid);
        _profileClientMock
            .Setup(p => p.GetUserProfile(partyGuid))
            .ReturnsAsync(
                new UserProfile
                {
                    ProfileSettingPreference = new ProfileSettingPreference { Language = LanguageConst.Nb },
                }
            );

        var result = await CreateSut().DetermineLanguage(instanceOwner, requestedOrgLanguage: null);

        Assert.Equal(LanguageConst.Nb, result);
        _partyClientMock.Verify(p => p.GetPartyUuidByUrn("ext-user-42"), Times.Once);
        _profileClientMock.Verify(p => p.GetUserProfile(partyGuid), Times.Once);
    }

    [Fact]
    public async Task DetermineLanguage_ExternalIdentifierOwner_ProfileLanguageIsNull_FallsBackToEnglish()
    {
        var partyGuid = Guid.NewGuid();
        var instanceOwner = new InstanceOwner { ExternalIdentifier = "ext-user-42" };

        _partyClientMock.Setup(p => p.GetPartyUuidByUrn("ext-user-42")).ReturnsAsync(partyGuid);
        _profileClientMock
            .Setup(p => p.GetUserProfile(partyGuid))
            .ReturnsAsync(
                new UserProfile { ProfileSettingPreference = new ProfileSettingPreference { Language = null } }
            );

        var result = await CreateSut().DetermineLanguage(instanceOwner, requestedOrgLanguage: null);

        Assert.Equal(LanguageConst.En, result);
    }

    [Fact]
    public async Task DetermineLanguage_ExternalIdentifierOwner_ProfileIsNull_FallsBackToEnglish()
    {
        var partyGuid = Guid.NewGuid();
        var instanceOwner = new InstanceOwner { ExternalIdentifier = "ext-user-42" };

        _partyClientMock.Setup(p => p.GetPartyUuidByUrn("ext-user-42")).ReturnsAsync(partyGuid);

        UserProfile? profile = null;
        _profileClientMock.Setup(p => p.GetUserProfile(partyGuid)).ReturnsAsync(profile);

        var result = await CreateSut().DetermineLanguage(instanceOwner, requestedOrgLanguage: null);

        Assert.Equal(LanguageConst.En, result);
    }

    #endregion

    #region GetTitleFromMetadata

    [Fact]
    public void GetTitleFromMetadata_NullMetadata_ReturnsNull()
    {
        var result = NotificationService.GetTitleFromMetadata(LanguageConst.Nb, null);

        Assert.Null(result);
    }

    [Fact]
    public void GetTitleFromMetadata_NullUnmappedProperties_ReturnsNull()
    {
        var metadata = new ApplicationMetadata("ttd/app") { UnmappedProperties = null };

        var result = NotificationService.GetTitleFromMetadata(LanguageConst.Nb, metadata);

        Assert.Null(result);
    }

    [Fact]
    public void GetTitleFromMetadata_NoTitleKey_ReturnsNull()
    {
        var metadata = new ApplicationMetadata("ttd/app")
        {
            UnmappedProperties = new Dictionary<string, object>
            {
                ["someOtherKey"] = JsonSerializer.SerializeToElement("value"),
            },
        };

        var result = NotificationService.GetTitleFromMetadata(LanguageConst.Nb, metadata);

        Assert.Null(result);
    }

    [Theory]
    [InlineData(LanguageConst.Nb, "Bokmål tittel")]
    [InlineData(LanguageConst.Nn, "Nynorsk tittel")]
    [InlineData(LanguageConst.En, "English title")]
    public void GetTitleFromMetadata_MatchingLanguage_ReturnsTitle(string language, string expectedTitle)
    {
        var titleJson = JsonSerializer.SerializeToElement(
            new Dictionary<string, string>
            {
                [LanguageConst.Nb] = "Bokmål tittel",
                [LanguageConst.Nn] = "Nynorsk tittel",
                [LanguageConst.En] = "English title",
            }
        );

        var metadata = new ApplicationMetadata("ttd/app")
        {
            UnmappedProperties = new Dictionary<string, object> { ["title"] = titleJson },
        };

        var result = NotificationService.GetTitleFromMetadata(language, metadata);

        Assert.Equal(expectedTitle, result);
    }

    [Fact]
    public void GetTitleFromMetadata_LanguageNotInTitle_ReturnsNull()
    {
        var titleJson = JsonSerializer.SerializeToElement(
            new Dictionary<string, string> { [LanguageConst.Nb] = "Bokmål tittel" }
        );

        var metadata = new ApplicationMetadata("ttd/app")
        {
            UnmappedProperties = new Dictionary<string, object> { ["title"] = titleJson },
        };

        var result = NotificationService.GetTitleFromMetadata(LanguageConst.En, metadata);

        Assert.Null(result);
    }

    #endregion

    #region CreateNotificationOrderRequest

    [Fact]
    public void CreateNotificationOrderRequest_OrgOwner_SetsResourceId()
    {
        var instance = CreateTestInstance(appId: "ttd/my-app", orgNumber: "123456789");
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: "Firma AS",
            serviceOwnerName: null,
            instantiationNotification: DefaultNotification(),
            conditionEndpoint: conditionEndpoint
        );

        Assert.Equal("urn:altinn:resource:app_ttd_my-app", result.Recipient.RecipientOrganization?.ResourceId);
    }

    [Fact]
    public void CreateNotificationOrderRequest_PersonOwner_SetsResourceId()
    {
        var instance = CreateTestInstance(appId: "ttd/my-app", personNumber: "01010112345");
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: "Ola Nordmann",
            serviceOwnerName: null,
            instantiationNotification: DefaultNotification(),
            conditionEndpoint: conditionEndpoint
        );

        Assert.Equal("urn:altinn:resource:app_ttd_my-app", result.Recipient.RecipientPerson?.ResourceId);
    }

    [Fact]
    public void CreateNotificationOrderRequest_ExternalIdentifierOwner_SetsResourceId()
    {
        var instance = CreateTestInstance(appId: "ttd/my-app", externalIdentifier: "ext-user-42");
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.En,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: DefaultNotification(),
            conditionEndpoint: conditionEndpoint
        );

        Assert.Equal("urn:altinn:resource:app_ttd_my-app", result.Recipient.RecipientExternalIdentity?.ResourceId);
    }

    [Fact]
    public void CreateNotificationOrderRequest_NoOwnerIdentifier_Throws()
    {
        var instance = CreateTestInstance(appId: "ttd/my-app");
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        Assert.Throws<InvalidOperationException>(() =>
            NotificationService.CreateNotificationOrderRequest(
                language: LanguageConst.Nb,
                instance: instance,
                applicationMetadata: null,
                instanceOwnerName: null,
                serviceOwnerName: null,
                instantiationNotification: DefaultNotification(),
                conditionEndpoint: conditionEndpoint
            )
        );
    }

    #endregion

    #region RequestedSendTime and ConditionEndpoint

    [Fact]
    public void CreateNotificationOrderRequest_NoRequestedSendTime_DefaultsToFiveMinutesFromNow_AndNoConditionEndpoint()
    {
        var instance = CreateTestInstance(appId: "ttd/my-app", personNumber: "01010112345");
        var before = DateTime.Now.AddMinutes(5);

        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: DefaultNotification(), // RequestedSendTime is null
            conditionEndpoint: conditionEndpoint
        );

        var after = DateTime.Now.AddMinutes(5);

        Assert.Equal(conditionEndpoint, result.ConditionEndpoint);
        Assert.InRange(result.RequestedSendTime, before, after);
    }

    #endregion

    #region Reminders

    [Fact]
    public void BuildReminders_NullReminders_ReturnsNull()
    {
        var instance = CreateTestInstance(orgNumber: "123456789");
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );
        var notification = NotificationWithReminders(null);

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        Assert.Null(result.Reminders);
    }

    [Fact]
    public void BuildReminders_EmptyReminders_ReturnsNull()
    {
        var instance = CreateTestInstance(orgNumber: "123456789");
        List<InstantiationNotificationReminder> remindersEmpty = [];
        var notification = NotificationWithReminders(remindersEmpty);
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        Assert.Null(result.Reminders);
    }

    [Fact]
    public void BuildReminders_TwoReminders_ReturnsBothReminders()
    {
        var instance = CreateTestInstance(orgNumber: "123456789");
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );
        List<InstantiationNotificationReminder> reminders =
        [
            new InstantiationNotificationReminder { SendAfterDays = 3 },
            new InstantiationNotificationReminder { SendAfterDays = 7 },
        ];

        var notification = NotificationWithReminders(reminders);

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        Assert.Equal(2, result.Reminders?.Count);
    }

    [Fact]
    public void BuildReminders_DelayDaysAndRequestedSendTime_AreMappedFromReminder()
    {
        var sendTime = DateTime.UtcNow.AddDays(10);
        var instance = CreateTestInstance(orgNumber: "123456789");

        List<InstantiationNotificationReminder> reminders =
        [
            new InstantiationNotificationReminder { SendAfterDays = 5, RequestedSendTime = sendTime },
        ];
        var notification = NotificationWithReminders(reminders);
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        var reminder = Assert.Single(result.Reminders!);
        Assert.Equal(5, reminder.DelayDays);
        Assert.Equal(sendTime, reminder.RequestedSendTime);
    }

    [Fact]
    public void BuildReminders_WithRequestedSendTime_ConditionEndpointPropagatedToReminders()
    {
        var instance = CreateTestInstance(appId: "ttd/my-app", orgNumber: "123456789");
        var notification = new InstantiationNotification
        {
            NotificationChannel = NotificationChannel.Email,
            RequestedSendTime = DateTime.UtcNow.AddDays(1),
            Reminders = [new InstantiationNotificationReminder { SendAfterDays = 3 }],
        };

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: new Uri("https://ttd.apps.tt02.altinn.no/ttd/my-app")
        );

        var reminder = Assert.Single(result.Reminders!);
        Assert.Equal(result.ConditionEndpoint, reminder.ConditionEndpoint);
    }

    // --- Recipient type preservation ---

    [Fact]
    public void BuildReminders_OrgOwner_ReminderRecipientIsOrganization()
    {
        var instance = CreateTestInstance(orgNumber: "123456789");
        List<InstantiationNotificationReminder> reminders = [new InstantiationNotificationReminder()];
        var notification = NotificationWithReminders(reminders);
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        var reminder = Assert.Single(result.Reminders!);
        Assert.NotNull(reminder.Recipient.RecipientOrganization);
        Assert.Equal("123456789", reminder.Recipient.RecipientOrganization.OrgNumber);
    }

    [Fact]
    public void BuildReminders_PersonOwner_ReminderRecipientIsPerson()
    {
        var instance = CreateTestInstance(personNumber: "01010112345");

        List<InstantiationNotificationReminder> reminders = [new InstantiationNotificationReminder()];
        var notification = NotificationWithReminders(reminders);
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        var reminder = Assert.Single(result.Reminders!);
        Assert.NotNull(reminder.Recipient.RecipientPerson);
        Assert.Equal("01010112345", reminder.Recipient.RecipientPerson.NationalIdentityNumber);
    }

    [Fact]
    public void BuildReminders_ExternalIdentityOwner_ReminderRecipientIsExternalIdentity()
    {
        var instance = CreateTestInstance(externalIdentifier: "urn:altinn:person:idporten-email:user@example.com");

        List<InstantiationNotificationReminder> reminders = [new InstantiationNotificationReminder()];
        var notification = NotificationWithReminders(reminders);
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.En,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        var reminder = Assert.Single(result.Reminders!);
        Assert.NotNull(reminder.Recipient.RecipientExternalIdentity);
        Assert.Equal(
            "urn:altinn:person:idporten-email:user@example.com",
            reminder.Recipient.RecipientExternalIdentity.ExternalIdentity
        );
    }

    // --- Custom email/sms override vs inherit ---

    [Fact]
    public void BuildReminders_NoCustomEmailOrSms_InheritsParentSettings()
    {
        var instance = CreateTestInstance(orgNumber: "123456789");
        var notification = new InstantiationNotification
        {
            NotificationChannel = NotificationChannel.EmailAndSms,
            CustomEmail = new CustomEmail
            {
                Subject = new CustomText
                {
                    Nb = "Parent subject",
                    Nn = "Parent subject",
                    En = "Parent subject",
                },
                Body = new CustomText
                {
                    Nb = "Parent body",
                    Nn = "Parent body",
                    En = "Parent body",
                },
            },
            CustomSms = new CustomSms
            {
                SenderName = "ParentSender",
                Text = new CustomText
                {
                    Nb = "Parent sms",
                    Nn = "Parent sms",
                    En = "Parent sms",
                },
            },
            Reminders = [new InstantiationNotificationReminder()], // no custom overrides
        };
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        var reminderOrg = Assert.Single(result.Reminders!).Recipient.RecipientOrganization!;
        Assert.Equal("Parent subject", reminderOrg.EmailSettings?.Subject);
        Assert.Equal("Parent body", reminderOrg.EmailSettings?.Body);
        Assert.Equal("ParentSender", reminderOrg.SmsSettings?.Sender);
        Assert.Equal("Parent sms", reminderOrg.SmsSettings?.Body);
    }

    [Fact]
    public void BuildReminders_WithCustomEmail_OverridesEmailSettings()
    {
        var instance = CreateTestInstance(orgNumber: "123456789");
        var notification = new InstantiationNotification
        {
            NotificationChannel = NotificationChannel.Email,
            Reminders =
            [
                new InstantiationNotificationReminder
                {
                    CustomEmail = new CustomEmail
                    {
                        Subject = new CustomText
                        {
                            Nb = "Reminder subject",
                            Nn = "Reminder subject",
                            En = "Reminder subject",
                        },
                        Body = new CustomText
                        {
                            Nb = "Reminder body",
                            Nn = "Reminder body",
                            En = "Reminder body",
                        },
                    },
                },
            ],
        };

        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );
        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        var reminderOrg = Assert.Single(result.Reminders!).Recipient.RecipientOrganization!;
        Assert.Equal("Reminder subject", reminderOrg.EmailSettings?.Subject);
        Assert.Equal("Reminder body", reminderOrg.EmailSettings?.Body);
    }

    [Fact]
    public void BuildReminders_WithCustomSms_OverridesSmsSettings()
    {
        var instance = CreateTestInstance(orgNumber: "123456789");
        var notification = new InstantiationNotification
        {
            NotificationChannel = NotificationChannel.Sms,
            Reminders =
            [
                new InstantiationNotificationReminder
                {
                    CustomSms = new CustomSms
                    {
                        SenderName = "ReminderSender",
                        Text = new CustomText
                        {
                            Nb = "Reminder sms",
                            Nn = "Reminder sms",
                            En = "Reminder sms",
                        },
                    },
                },
            ],
        };
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        var reminderOrg = Assert.Single(result.Reminders!).Recipient.RecipientOrganization!;
        Assert.Equal("ReminderSender", reminderOrg.SmsSettings?.Sender);
        Assert.Equal("Reminder sms", reminderOrg.SmsSettings?.Body);
    }

    [Theory]
    [InlineData(LanguageConst.Nb, "Reminder nb")]
    [InlineData(LanguageConst.Nn, "Reminder nn")]
    [InlineData(LanguageConst.En, "Reminder en")]
    public void BuildReminders_CustomEmailText_UsesCorrectLanguage(string language, string expectedBody)
    {
        var instance = CreateTestInstance(orgNumber: "123456789");
        var notification = new InstantiationNotification
        {
            NotificationChannel = NotificationChannel.Email,
            Reminders =
            [
                new InstantiationNotificationReminder
                {
                    CustomEmail = new CustomEmail
                    {
                        Subject = new CustomText
                        {
                            Nb = "s",
                            Nn = "s",
                            En = "s",
                        },
                        Body = new CustomText
                        {
                            Nb = "Reminder nb",
                            Nn = "Reminder nn",
                            En = "Reminder en",
                        },
                    },
                },
            ],
        };
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: language,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        var reminderOrg = Assert.Single(result.Reminders!).Recipient.RecipientOrganization!;
        Assert.Equal(expectedBody, reminderOrg.EmailSettings?.Body);
    }

    [Fact]
    public void BuildReminders_TwoRemindersWithDifferentCustomText_ProduceIndependentSettings()
    {
        var instance = CreateTestInstance(orgNumber: "123456789");
        var notification = new InstantiationNotification
        {
            NotificationChannel = NotificationChannel.Email,
            Reminders =
            [
                new InstantiationNotificationReminder
                {
                    CustomEmail = new CustomEmail
                    {
                        Subject = new CustomText
                        {
                            Nb = "First subject",
                            Nn = "First subject",
                            En = "First subject",
                        },
                        Body = new CustomText
                        {
                            Nb = "First body",
                            Nn = "First body",
                            En = "First body",
                        },
                    },
                },
                new InstantiationNotificationReminder
                {
                    CustomEmail = new CustomEmail
                    {
                        Subject = new CustomText
                        {
                            Nb = "Second subject",
                            Nn = "Second subject",
                            En = "Second subject",
                        },
                        Body = new CustomText
                        {
                            Nb = "Second body",
                            Nn = "Second body",
                            En = "Second body",
                        },
                    },
                },
            ],
        };
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        Assert.Equal(2, result.Reminders!.Count);
        Assert.Equal("First body", result.Reminders[0].Recipient.RecipientOrganization!.EmailSettings?.Body);
        Assert.Equal("Second body", result.Reminders[1].Recipient.RecipientOrganization!.EmailSettings?.Body);
    }

    #endregion

    #region SendTime

    [Theory]
    [InlineData(true, SendingTimePolicy.Anytime)]
    [InlineData(false, SendingTimePolicy.Daytime)]
    public void CreateNotificationOrderRequest_SendingTimePolicy_ReflectsAllowSendingAfterWorkHours(
        bool allowSendingAfterWorkHours,
        SendingTimePolicy expectedPolicy
    )
    {
        var instance = CreateTestInstance(orgNumber: "123456789");
        var notification = new InstantiationNotification
        {
            NotificationChannel = NotificationChannel.EmailAndSms,
            AllowSendingAfterWorkHours = allowSendingAfterWorkHours,
        };
        var conditionEndpoint = new Uri(
            "https://ttd.apps.tt02.altinn.no/api/v1/notification-webhook-listener/1337/some-guid?code=token"
        );

        var result = NotificationService.CreateNotificationOrderRequest(
            language: LanguageConst.Nb,
            instance: instance,
            applicationMetadata: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            instantiationNotification: notification,
            conditionEndpoint: conditionEndpoint
        );

        var org = result.Recipient.RecipientOrganization!;
        Assert.Equal(expectedPolicy, org.SmsSettings?.SendingTimePolicy);
    }

    #endregion

    #region Callback uri

    [Fact]
    public void CallbackUrlWithAuth_IncludesOrgAppAndInstanceInPath()
    {
        // Arrange
        var instance = new Instance
        {
            Id = "53440291/772f4e79-c494-4848-a74b-1b786d334069",
            AppId = "ttd/my-app",
            Org = "ttd",
        };
        var baseUrl = "https://ttd.apps.tt02.altinn.no/ttd/my-app";

        var expectedInstanceGuid = Guid.Parse("772f4e79-c494-4848-a74b-1b786d334069");

        _ = _tokenGenerator
            .Setup(x =>
                x.GenerateToken(
                    expectedInstanceGuid,
                    It.IsAny<Core.Features.Telemetry?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns("test-token");

        // Act
        var result = CreateSut().CallbackUrlWithAuth(instance, baseUrl);

        // Assert
        Assert.Equal("https", result.Scheme);
        Assert.Equal("ttd.apps.tt02.altinn.no", result.Host);
        Assert.Equal(
            "/ttd/my-app/api/v1/notification-webhook-listener/53440291/772f4e79-c494-4848-a74b-1b786d334069",
            result.AbsolutePath
        );
        Assert.Contains("code=test-token", result.Query);
        _tokenGenerator.Verify(
            x =>
                x.GenerateToken(
                    expectedInstanceGuid,
                    It.IsAny<Core.Features.Telemetry?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    #endregion

    #region Guard

    [Fact]
    public async Task DetermineLanguage_NoIdentifierSet_ThrowsInvalidOperationException()
    {
        var instanceOwner = new InstanceOwner();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            CreateSut().DetermineLanguage(instanceOwner, requestedOrgLanguage: null)
        );
    }

    #endregion
}
