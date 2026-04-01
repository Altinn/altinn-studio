using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Notifications.SecretProvider;
using Altinn.App.Core.Features.Notifications.Texts;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Notifications;

internal sealed class NotificationService : INotificationService
{
    private readonly INotificationOrderClient _notificationOrderClient;
    private readonly INotificationConditionTokenGenerator _tokenGenerator;
    private readonly IProfileClient _profileClient;
    private readonly IAltinnCdnClient _cdnClient;
    private readonly IAppMetadata _appMetadata;
    private readonly IAltinnPartyClient _altinnPartyClient;
    private readonly ILogger<NotificationService> _logger;
    private readonly GeneralSettings _generalSettings;

    public NotificationService(
        INotificationOrderClient notificationOrderClient,
        INotificationConditionTokenGenerator tokenGenerator,
        IProfileClient profileClient,
        IAltinnCdnClient cdnClient,
        IAppMetadata appMetadata,
        IAltinnPartyClient altinnPartyClient,
        IOptions<GeneralSettings> generalSettings,
        ILogger<NotificationService> logger
    )
    {
        _notificationOrderClient = notificationOrderClient;
        _tokenGenerator = tokenGenerator;
        _profileClient = profileClient;
        _cdnClient = cdnClient;
        _appMetadata = appMetadata;
        _altinnPartyClient = altinnPartyClient;
        _logger = logger;
        _generalSettings = generalSettings.Value;
    }

    /// <inheritdoc />
    public async Task NotifyInstanceOwnerOnInstantiation(
        Instance instance,
        Party party,
        InstantiationNotification instantiationNotification,
        CancellationToken ct
    )
    {
        InstanceOwner instanceOwner = instance.InstanceOwner;
        string language = await DetermineLanguage(instanceOwner, instantiationNotification.Language);
        AltinnCdnOrgName? serviceOwnerName = await _cdnClient.GetOrgNameByAppId(instance.AppId, ct);
        ApplicationMetadata? appMetadata = await _appMetadata.GetApplicationMetadata();
        string baseUrl = _generalSettings.FormattedExternalAppBaseUrl(new AppIdentifier(instance.AppId));
        Uri callBackUri = CallbackUrlWithAuth(instance, baseUrl);

        NotificationOrderRequest orderRequest = CreateNotificationOrderRequest(
            language,
            instance,
            appMetadata,
            party.Name,
            serviceOwnerName,
            instantiationNotification,
            callBackUri
        );

        NotificationOrderResponse orderResponse = await _notificationOrderClient.Order(orderRequest, ct);

        _logger.LogInformation(
            "Notification order created. OrderId: {OrderId}, ShipmentId: {ShipmentId}, Reference: {SendersReference}, ReminderCount: {ReminderCount}, ReminderShipmentIds: {ReminderShipmentIds}",
            orderResponse.OrderChainId,
            orderResponse.Notification.ShipmentId,
            orderRequest.SendersReference,
            orderRequest.Reminders?.Count ?? 0,
            orderResponse.Reminders.Count > 0
                ? string.Join(", ", orderResponse.Reminders.Select(r => r.ShipmentId))
                : "none"
        );
    }

    internal static NotificationOrderRequest CreateNotificationOrderRequest(
        string language,
        Instance instance,
        ApplicationMetadata? applicationMetadata,
        string? instanceOwnerName,
        AltinnCdnOrgName? serviceOwnerName,
        InstantiationNotification instantiationNotification,
        Uri conditionEndpoint
    )
    {
        InstanceOwner instanceOwner = instance.InstanceOwner;
        DateTime? dueDate = instance.DueBefore.HasValue ? instance.DueBefore.Value : null;
        string? appTitle = GetTitleFromMetadata(language, applicationMetadata);
        SendingTimePolicy sendingTimePolicy = instantiationNotification.AllowSendingAfterWorkHours is true
            ? SendingTimePolicy.Anytime
            : SendingTimePolicy.Daytime;

        CustomEmail? customEmail = instantiationNotification.CustomEmail;
        EmailSendingOptions emailSettings = new()
        {
            Subject = customEmail is not null
                ? NotificationTexts.ReplaceTokens(
                    text: customEmail.Subject.GetTextForLanguage(language),
                    appId: instance.AppId,
                    title: appTitle,
                    instanceOwnerName: instanceOwnerName,
                    serviceOwnerName: serviceOwnerName?.GetByLanguage(language),
                    orgNumber: instanceOwner.OrganisationNumber,
                    nationalIndentityNumber: instanceOwner.PersonNumber,
                    dueDateTime: dueDate
                )
                : NotificationTexts.GetDefaultSubject(language),
            Body = customEmail is not null
                ? NotificationTexts.ReplaceTokens(
                    text: customEmail.Body.GetTextForLanguage(language),
                    appId: instance.AppId,
                    title: appTitle,
                    instanceOwnerName: instanceOwnerName,
                    serviceOwnerName: serviceOwnerName?.GetByLanguage(language),
                    orgNumber: instanceOwner.OrganisationNumber,
                    nationalIndentityNumber: instanceOwner.PersonNumber,
                    dueDateTime: dueDate
                )
                : NotificationTexts.GetDefaultBody(
                    language: language,
                    appid: instance.AppId,
                    instanceOwnerName: instanceOwnerName,
                    serviceOwnerName: serviceOwnerName?.GetByLanguage(language),
                    orgNumber: instanceOwner.OrganisationNumber,
                    nationalIndentityNumber: instanceOwner.PersonNumber,
                    dueDate: dueDate
                ),
        };

        CustomSms? customSms = instantiationNotification.CustomSms;
        SmsSendingOptions smsSettings = new()
        {
            SendingTimePolicy = sendingTimePolicy,
            Sender = customSms?.SenderName ?? "Altinn",
            Body = customSms is not null
                ? NotificationTexts.ReplaceTokens(
                    text: customSms.Text.GetTextForLanguage(language),
                    appId: instance.AppId,
                    title: appTitle,
                    instanceOwnerName: instanceOwnerName,
                    serviceOwnerName: serviceOwnerName?.GetByLanguage(language),
                    orgNumber: instanceOwner.OrganisationNumber,
                    nationalIndentityNumber: instanceOwner.PersonNumber,
                    dueDateTime: dueDate
                )
                : NotificationTexts.GetDefaultBody(
                    language: language,
                    appid: instance.AppId,
                    instanceOwnerName: instanceOwnerName,
                    serviceOwnerName: serviceOwnerName?.GetByLanguage(language),
                    orgNumber: instanceOwner.OrganisationNumber,
                    nationalIndentityNumber: instanceOwner.PersonNumber,
                    dueDate: dueDate
                ),
        };
        NotificationChannel requestedChannel = instantiationNotification.NotificationChannel;

        AppResourceId resourceId = AppResourceId.FromAppIdentifier(new(instance.AppId));
        DateTime requestedSendTimeOrDefault = instantiationNotification.RequestedSendTime ?? DateTime.Now.AddMinutes(5);
        string sendersReference = "app-" + instance.Id;
        string idempotencyId = instance.Id + "-init";

        if (string.IsNullOrWhiteSpace(instanceOwner.OrganisationNumber) is false)
        {
            NotificationRecipient recipient = new()
            {
                RecipientOrganization = new RecipientOrganization
                {
                    OrgNumber = instanceOwner.OrganisationNumber,
                    ChannelSchema = requestedChannel,
                    EmailSettings = emailSettings,
                    SmsSettings = smsSettings,
                    ResourceId = resourceId.AsUrn,
                },
            };

            List<NotificationReminder>? reminders = BuildReminders(
                language,
                recipient,
                conditionEndpoint,
                instantiationNotification.Reminders
            );

            return new NotificationOrderRequest
            {
                SendersReference = sendersReference,
                IdempotencyId = idempotencyId,
                RequestedSendTime = requestedSendTimeOrDefault,
                ConditionEndpoint = conditionEndpoint,
                Recipient = recipient,
                Reminders = reminders,
            };
        }

        if (string.IsNullOrWhiteSpace(instanceOwner.PersonNumber) is false)
        {
            NotificationRecipient recipient = new()
            {
                RecipientPerson = new RecipientPerson
                {
                    NationalIdentityNumber = instanceOwner.PersonNumber,
                    ChannelSchema = requestedChannel,
                    EmailSettings = emailSettings,
                    SmsSettings = smsSettings,
                    ResourceId = resourceId.AsUrn,
                },
            };

            List<NotificationReminder>? reminders = BuildReminders(
                language,
                recipient,
                conditionEndpoint,
                instantiationNotification.Reminders
            );

            return new NotificationOrderRequest
            {
                SendersReference = sendersReference,
                IdempotencyId = idempotencyId,
                RequestedSendTime = requestedSendTimeOrDefault,
                ConditionEndpoint = conditionEndpoint,
                Recipient = recipient,
                Reminders = reminders,
            };
        }

        if (string.IsNullOrWhiteSpace(instanceOwner.ExternalIdentifier) is false)
        {
            NotificationRecipient recipient = new()
            {
                RecipientExternalIdentity = new RecipientExternalIdentity
                {
                    ExternalIdentity = instanceOwner.ExternalIdentifier,
                    ChannelSchema = NotificationChannel.EmailPreferred,
                    SmsSettings = smsSettings,
                    EmailSettings = emailSettings,
                    ResourceId = resourceId.AsUrn,
                },
            };

            List<NotificationReminder>? reminders = BuildReminders(
                language,
                recipient,
                conditionEndpoint,
                instantiationNotification.Reminders
            );

            return new NotificationOrderRequest
            {
                SendersReference = sendersReference,
                IdempotencyId = idempotencyId,
                RequestedSendTime = requestedSendTimeOrDefault,
                ConditionEndpoint = conditionEndpoint,
                Recipient = recipient,
                Reminders = reminders,
            };
        }

        throw new InvalidOperationException(
            "InstanceOwner must have at least one of OrganisationNumber, PersonNumber, or ExternalIdentifier set."
        );
    }

    internal Uri CallbackUrlWithAuth(Instance instance, string callBackBaseUrl)
    {
        InstanceIdentifier instanceIdentifier = new(instance.Id);
        string token = _tokenGenerator.GenerateToken(instanceIdentifier.InstanceGuid);

        var uriBuilder = new UriBuilder(callBackBaseUrl.TrimEnd('/'));
        uriBuilder.Path = uriBuilder.Path.TrimEnd('/') + $"/api/v1/notification-webhook-listener/{instance.Id}";
        uriBuilder.Query = $"code={Uri.EscapeDataString(token)}";
        return uriBuilder.Uri;
    }

    private static List<NotificationReminder>? BuildReminders(
        string language,
        NotificationRecipient requestedRecipient,
        Uri? conditionEndpoint,
        List<InstantiationNotificationReminder>? requestedReminders
    )
    {
        if (requestedReminders is null or { Count: 0 })
            return null;

        var reminders = new List<NotificationReminder>(requestedReminders.Count);

        foreach (var requestedReminder in requestedReminders)
        {
            // Build a recipient that mirrors the original, but with reminder-specific
            // email/sms overrides if provided (falling back to the original settings).
            NotificationRecipient recipient = BuildReminderRecipient(language, requestedRecipient, requestedReminder);

            reminders.Add(
                new NotificationReminder
                {
                    Recipient = recipient,
                    ConditionEndpoint = conditionEndpoint,
                    RequestedSendTime = requestedReminder.RequestedSendTime,
                    DelayDays = requestedReminder.SendAfterDays,
                }
            );
        }

        return reminders;
    }

    private static NotificationRecipient BuildReminderRecipient(
        string language,
        NotificationRecipient original,
        InstantiationNotificationReminder reminder
    )
    {
        // Each branch copies the original recipient type and applies any
        // reminder-level custom email/sms overrides on top.
        if (original.RecipientOrganization is { } org)
        {
            return new NotificationRecipient
            {
                RecipientOrganization = org with
                {
                    EmailSettings = reminder.CustomEmail is not null
                        ? BuildEmailSettings(language, reminder.CustomEmail, org.EmailSettings)
                        : org.EmailSettings,
                    SmsSettings = reminder.CustomSms is not null
                        ? BuildSmsSettings(language, reminder.CustomSms, org.SmsSettings)
                        : org.SmsSettings,
                },
            };
        }

        if (original.RecipientPerson is { } person)
        {
            return new NotificationRecipient
            {
                RecipientPerson = person with
                {
                    EmailSettings = reminder.CustomEmail is not null
                        ? BuildEmailSettings(language, reminder.CustomEmail, person.EmailSettings)
                        : person.EmailSettings,
                    SmsSettings = reminder.CustomSms is not null
                        ? BuildSmsSettings(language, reminder.CustomSms, person.SmsSettings)
                        : person.SmsSettings,
                },
            };
        }

        if (original.RecipientExternalIdentity is { } ext)
        {
            return new NotificationRecipient
            {
                RecipientExternalIdentity = ext with
                {
                    EmailSettings = reminder.CustomEmail is not null
                        ? BuildEmailSettings(language, reminder.CustomEmail, ext.EmailSettings)
                        : ext.EmailSettings,
                    SmsSettings = reminder.CustomSms is not null
                        ? BuildSmsSettings(language, reminder.CustomSms, ext.SmsSettings)
                        : ext.SmsSettings,
                },
            };
        }

        throw new InvalidOperationException("Original recipient has no recognized recipient type set.");
    }

    private static SmsSendingOptions BuildSmsSettings(
        string language,
        CustomSms customSms,
        SmsSendingOptions? smsSettings
    )
    {
        return (smsSettings ?? new SmsSendingOptions { Sender = "", Body = "" }) with
        {
            Sender = customSms.SenderName,
            Body = customSms.Text.GetTextForLanguage(language),
        };
    }

    private static EmailSendingOptions BuildEmailSettings(
        string language,
        CustomEmail customEmail,
        EmailSendingOptions? emailSettings
    )
    {
        return (emailSettings ?? new EmailSendingOptions { Subject = "", Body = "" }) with
        {
            Subject = customEmail.Subject.GetTextForLanguage(language),
            Body = customEmail.Body.GetTextForLanguage(language),
        };
    }

    internal static string? GetTitleFromMetadata(string language, ApplicationMetadata? applicationMetadata)
    {
        if (
            applicationMetadata?.UnmappedProperties?.TryGetValue("title", out object? titleObj) == true
            && titleObj is System.Text.Json.JsonElement titleElement
            && titleElement.TryGetProperty(language, out var titleForLanguage)
        )
        {
            return titleForLanguage.GetString();
        }
        return null;
    }

    internal async Task<string> DetermineLanguage(InstanceOwner instanceOwner, string? requestedOrgLanguage)
    {
        if (string.IsNullOrWhiteSpace(instanceOwner.PersonNumber) is false)
        {
            UserProfile? personProfile = await _profileClient.GetUserProfile(instanceOwner.PersonNumber);
            return personProfile?.ProfileSettingPreference?.Language ?? LanguageConst.Nb;
        }

        if (string.IsNullOrWhiteSpace(instanceOwner.ExternalIdentifier) is false)
        {
            Guid? partyGuid = await _altinnPartyClient.GetPartyUuidByUrn(instanceOwner.ExternalIdentifier);
            if (partyGuid is null)
            {
                return LanguageConst.En;
            }

            // HACK: userUuid == partyGuid
            UserProfile? userProfile = await _profileClient.GetUserProfile(partyGuid.Value);

            return userProfile?.ProfileSettingPreference?.Language ?? LanguageConst.En;
        }

        if (string.IsNullOrWhiteSpace(instanceOwner.OrganisationNumber) is false)
        {
            return requestedOrgLanguage ?? LanguageConst.Nb;
        }

        throw new InvalidOperationException(
            "InstanceOwner must have at least one of OrganisationNumber, PersonNumber, or ExternalIdentifier set."
        );
    }
}
