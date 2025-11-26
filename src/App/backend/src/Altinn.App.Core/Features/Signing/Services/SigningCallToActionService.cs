using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Correspondence;
using Altinn.App.Core.Features.Correspondence.Builder;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Signing.Services;

internal sealed class SigningCallToActionService(
    ICorrespondenceClient correspondenceClient,
    IHostEnvironment hostEnvironment,
    IAppMetadata appMetadata,
    IProfileClient profileClient,
    ITranslationService translationService,
    ILogger<SigningCallToActionService> logger,
    IOptions<GeneralSettings> settings,
    Telemetry? telemetry = null
) : ISigningCallToActionService
{
    private readonly ICorrespondenceClient _correspondenceClient = correspondenceClient;
    private readonly IHostEnvironment _hostEnvironment = hostEnvironment;
    private readonly IAppMetadata _appMetadata = appMetadata;
    private readonly IProfileClient _profileClient = profileClient;
    private readonly ILogger<SigningCallToActionService> _logger = logger;
    private readonly Telemetry? _telemetry = telemetry;
    private readonly UrlHelper _urlHelper = new(settings);

    public async Task<SendCorrespondenceResponse?> SendSignCallToAction(
        CommunicationConfig? communicationConfig,
        AppIdentifier appIdentifier,
        InstanceIdentifier instanceIdentifier,
        Party signingParty,
        Party serviceOwnerParty,
        List<AltinnEnvironmentConfig>? correspondenceResources,
        CancellationToken ct
    )
    {
        using var activity = _telemetry?.StartSendSignCallToActionActivity();
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

        HostingEnvironment env = AltinnEnvironments.GetHostingEnvironment(_hostEnvironment);
        var resource = AltinnTaskExtension.GetConfigForEnvironment(env, correspondenceResources)?.Value;
        if (string.IsNullOrEmpty(resource))
        {
            throw new ConfigurationException(
                $"No correspondence resource configured for environment {env}, skipping correspondence send"
            );
        }

        OrganisationOrPersonIdentifier recipient = OrganisationOrPersonIdentifier.Parse(signingParty);
        string instanceUrl = _urlHelper.GetInstanceUrl(appIdentifier, instanceIdentifier);
        UserProfile? recipientProfile = null;
        if (recipient is OrganisationOrPersonIdentifier.Person person)
        {
            try
            {
                recipientProfile = await _profileClient.GetUserProfile(person.Value);
            }
            catch (Exception e)
            {
                _logger.LogWarning(
                    e,
                    "Unable to fetch profile for user with SSN, falling back to default values: {Exception}",
                    e.Message
                );
            }
        }
        string recipientLanguage = recipientProfile?.ProfileSettingPreference.Language ?? LanguageConst.Nb;
        ContentWrapper contentWrapper = await GetContent(
            instanceIdentifier,
            applicationMetadata,
            serviceOwnerParty,
            instanceUrl,
            recipientLanguage,
            communicationConfig
        );
        CorrespondenceContent correspondenceContent = contentWrapper.CorrespondenceContent;

        if (serviceOwnerParty.OrgNumber == "ttd" && _hostEnvironment.IsProduction() is false)
        {
            // TestDepartementet is often used in test environments, but does not have an organization number
            // Use Digitaliseringsdirektoratet's orgnr instead.
            serviceOwnerParty.OrgNumber = "991825827";
        }

        var request = new SendCorrespondencePayload(
            CorrespondenceRequestBuilder
                .Create()
                .WithResourceId(resource)
                .WithSender(serviceOwnerParty.OrgNumber)
                .WithSendersReference(instanceIdentifier.ToString())
                .WithRecipient(recipient)
                .WithContent(correspondenceContent)
                .WithNotificationIfConfigured(SigningNotificationHelper.CreateNotification(contentWrapper))
                .Build(),
            CorrespondenceAuthenticationMethod.Default()
        );

        SendCorrespondenceResponse response = await _correspondenceClient.Send(request, ct);
        var correspondenceId = response?.Correspondences[0]?.CorrespondenceId ?? Guid.Empty;
        _logger.LogInformation("Correspondence request sent. CorrespondenceId: {CorrespondenceId}", correspondenceId);
        return response;
    }

    internal async Task<ContentWrapper> GetContent(
        InstanceIdentifier instanceIdentifier,
        ApplicationMetadata appMetadata,
        Party senderParty,
        string instanceUrl,
        string language,
        CommunicationConfig? communicationConfig
    )
    {
        string? correspondenceTitle = null;
        string? correspondenceSummary = null;
        string? correspondenceBody = null;
        string? smsBody = null;
        string? emailBody = null;
        string? emailSubject = null;
        string? reminderEmailBody = null;
        string? reminderEmailSubject = null;
        string? reminderSmsBody = null;
        string? appName = null;

        string appOwner = senderParty.Name ?? appMetadata.Org;

        try
        {
            string linkDisplayText = SigningTextHelper.GetLinkDisplayText(language);
            correspondenceTitle = await translationService.TranslateTextKeyLenient(
                communicationConfig?.InboxMessage?.TitleTextResourceKey,
                language
            );
            correspondenceSummary = await translationService.TranslateTextKeyLenient(
                communicationConfig?.InboxMessage?.SummaryTextResourceKey,
                language
            );
            correspondenceBody = await translationService.TranslateTextKeyLenient(
                communicationConfig?.InboxMessage?.BodyTextResourceKey,
                language
            );

            correspondenceBody = correspondenceBody?.Replace(
                "$instanceUrl$",
                $"[{linkDisplayText}]({instanceUrl})",
                StringComparison.InvariantCultureIgnoreCase
            );

            // TODO: Should be deprecated in the future, but is used in some apps today.
            correspondenceBody = correspondenceBody?.Replace(
                "$InstanceUrl",
                $"[{linkDisplayText}]({instanceUrl})",
                StringComparison.InvariantCultureIgnoreCase
            );

            smsBody = await translationService.TranslateTextKeyLenient(
                communicationConfig?.Notification?.Sms?.BodyTextResourceKey,
                language
            );
            emailBody = await translationService.TranslateTextKeyLenient(
                communicationConfig?.Notification?.Email?.BodyTextResourceKey,
                language
            );
            emailSubject = await translationService.TranslateTextKeyLenient(
                communicationConfig?.Notification?.Email?.SubjectTextResourceKey,
                language
            );
            reminderEmailBody = await translationService.TranslateTextKeyLenient(
                communicationConfig?.ReminderNotification?.Email?.BodyTextResourceKey,
                language
            );
            reminderEmailSubject = await translationService.TranslateTextKeyLenient(
                communicationConfig?.ReminderNotification?.Email?.SubjectTextResourceKey,
                language
            );
            reminderSmsBody = await translationService.TranslateTextKeyLenient(
                communicationConfig?.ReminderNotification?.Sms?.BodyTextResourceKey,
                language
            );
            appName = await translationService.TranslateTextKey("appName", language);
        }
        catch (Exception e)
        {
            _logger.LogWarning(
                e,
                "Unable to fetch custom message correspondence message content, falling back to default values: {Exception}",
                e.Message
            );
        }

        if (string.IsNullOrWhiteSpace(appName))
        {
            appName =
                appMetadata.Title?.GetValueOrDefault(language)
                ?? appMetadata.Title?.FirstOrDefault().Value
                ?? appMetadata.Id;
        }

        var defaults = SigningTextHelper.GetDefaultTexts(instanceUrl, language, appName, appOwner);

        NotificationChoice? notificationChoice =
            (communicationConfig?.NotificationChoice is null or NotificationChoice.None)
                ? SigningNotificationHelper.GetNotificationChoiceIfNotSet(communicationConfig?.Notification)
                : communicationConfig?.NotificationChoice;

        ContentWrapper contentWrapper = new()
        {
            CorrespondenceContent = new CorrespondenceContent()
            {
                Language = LanguageCode<Iso6391>.Parse(language),
                Title = correspondenceTitle ?? defaults.Title,
                Summary = correspondenceSummary ?? defaults.Summary,
                Body = correspondenceBody ?? defaults.Body,
            },
            NotificationChoice = notificationChoice,
            Notification = communicationConfig?.Notification,
            ReminderNotification = communicationConfig?.ReminderNotification,
            SendersReference = instanceIdentifier.ToString(),
            SmsBody = smsBody ?? defaults.SmsBody,
            EmailBody = emailBody ?? defaults.EmailBody,
            EmailSubject = emailSubject ?? defaults.Title,
            ReminderEmailBody = reminderEmailBody ?? defaults.ReminderEmailBody,
            ReminderEmailSubject = reminderEmailSubject ?? defaults.ReminderEmailSubject,
            ReminderSmsBody = reminderSmsBody ?? defaults.ReminderSmsBody,
        };
        return contentWrapper;
    }
}
