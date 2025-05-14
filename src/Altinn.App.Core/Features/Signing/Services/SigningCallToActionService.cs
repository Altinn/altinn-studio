using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Correspondence;
using Altinn.App.Core.Features.Correspondence.Builder;
using Altinn.App.Core.Features.Correspondence.Models;
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
            communicationConfig,
            appIdentifier,
            applicationMetadata,
            serviceOwnerParty,
            instanceUrl,
            recipientLanguage
        );
        CorrespondenceContent correspondenceContent = contentWrapper.CorrespondenceContent;
        string? emailBody = contentWrapper.EmailBody;
        string? emailSubject = contentWrapper.EmailSubject;
        string? smsBody = contentWrapper.SmsBody;
        Notification? notification = communicationConfig?.Notification;

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
                .WithNotificationIfConfigured(
                    GetNotificationChoice(notification) switch
                    {
                        NotificationChoice.Email => new CorrespondenceNotification
                        {
                            NotificationTemplate = CorrespondenceNotificationTemplate.CustomMessage,
                            NotificationChannel = CorrespondenceNotificationChannel.Email,
                            EmailSubject = emailSubject,
                            EmailBody = emailBody,
                            SendersReference = instanceIdentifier.ToString(),
                            CustomNotificationRecipients = OverrideRecipientIfConfigured(
                                recipient,
                                notification,
                                NotificationChoice.Email
                            ),
                        },
                        NotificationChoice.Sms => new CorrespondenceNotification
                        {
                            NotificationTemplate = CorrespondenceNotificationTemplate.CustomMessage,
                            NotificationChannel = CorrespondenceNotificationChannel.Sms,
                            SmsBody = smsBody,
                            SendersReference = instanceIdentifier.ToString(),
                            CustomNotificationRecipients = OverrideRecipientIfConfigured(
                                recipient,
                                notification,
                                NotificationChoice.Sms
                            ),
                        },
                        NotificationChoice.SmsAndEmail => new CorrespondenceNotification
                        {
                            NotificationTemplate = CorrespondenceNotificationTemplate.CustomMessage,
                            NotificationChannel = CorrespondenceNotificationChannel.EmailPreferred,
                            EmailSubject = emailSubject,
                            EmailBody = emailBody,
                            SmsBody = smsBody,
                            SendersReference = instanceIdentifier.ToString(),
                            CustomNotificationRecipients = OverrideRecipientIfConfigured(
                                recipient,
                                notification,
                                NotificationChoice.SmsAndEmail
                            ),
                        },
                        NotificationChoice.None => new CorrespondenceNotification
                        {
                            NotificationTemplate = CorrespondenceNotificationTemplate.GenericAltinnMessage,
                            NotificationChannel = CorrespondenceNotificationChannel.Email,
                            EmailSubject = emailSubject,
                            EmailBody = emailBody,
                            SendersReference = instanceIdentifier.ToString(),
                        },
                        _ => null,
                    }
                )
                .Build(),
            CorrespondenceAuthorisation.Maskinporten
        );

        SendCorrespondenceResponse response = await _correspondenceClient.Send(request, ct);
        var correspondenceId = response?.Correspondences[0]?.CorrespondenceId ?? Guid.Empty;
        _logger.LogInformation("Correspondence request sent. CorrespondenceId: {CorrespondenceId}", correspondenceId);
        return response;
    }

    internal static List<CorrespondenceNotificationRecipientWrapper>? OverrideRecipientIfConfigured(
        OrganisationOrPersonIdentifier recipient,
        Notification? notification,
        NotificationChoice notificationChoice
    )
    {
        if (notification is null || notificationChoice == NotificationChoice.None)
            return null;

        return
        [
            new CorrespondenceNotificationRecipientWrapper
            {
                RecipientToOverride = recipient,
                CorrespondenceNotificationRecipients =
                [
                    new CorrespondenceNotificationRecipient
                    {
                        EmailAddress = notificationChoice switch
                        {
                            NotificationChoice.Email => GetEmailOrThrow(notification),
                            NotificationChoice.SmsAndEmail => notification.Email?.EmailAddress,
                            NotificationChoice.Sms => null,
                            _ => null,
                        },
                        MobileNumber = notificationChoice switch
                        {
                            NotificationChoice.Sms => GetMobileNumberOrThrow(notification),
                            NotificationChoice.SmsAndEmail => notification.Sms?.MobileNumber,
                            NotificationChoice.Email => null,
                            _ => null,
                        },
                    },
                ],
            },
        ];
    }

    internal static string GetEmailOrThrow(Notification notification)
    {
        if (notification.Email?.EmailAddress is null)
        {
            throw new InvalidOperationException("Email address is required for email notifications.");
        }

        return notification.Email.EmailAddress;
    }

    internal static string GetMobileNumberOrThrow(Notification notification)
    {
        if (notification.Sms?.MobileNumber is null)
        {
            throw new InvalidOperationException("Mobile number is required for sms notifications.");
        }

        return notification.Sms.MobileNumber;
    }

    internal static string GetLinkDisplayText(string language)
    {
        return language switch
        {
            LanguageConst.Nn => "Klikk her for å opne skjema",
            LanguageConst.En => "Click here to open the form",
            LanguageConst.Nb => "Klikk her for å åpne skjema",
            _ => "Klikk her for å åpne skjema",
        };
    }

    internal async Task<ContentWrapper> GetContent(
        CommunicationConfig? communicationConfig,
        AppIdentifier appIdentifier,
        ApplicationMetadata appMetadata,
        Party senderParty,
        string instanceUrl,
        string language
    )
    {
        string? correspondenceTitle = null;
        string? correspondenceSummary = null;
        string? correspondenceBody = null;
        string? smsBody = null;
        string? emailBody = null;
        string? emailSubject = null;
        string? appName = null;

        string appOwner = senderParty.Name ?? appMetadata.Org;

        try
        {
            string linkDisplayText = GetLinkDisplayText(language);
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
            appName = await translationService.TranslateFirstMatchingTextKey(language, "appName", "ServiceName");
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

        var defaults = GetDefaultTexts(instanceUrl, language, appName, appOwner);
        ContentWrapper contentWrapper = new()
        {
            CorrespondenceContent = new CorrespondenceContent()
            {
                Language = LanguageCode<Iso6391>.Parse(language),
                Title = correspondenceTitle ?? defaults.Title,
                Summary = correspondenceSummary ?? defaults.Summary,
                Body = correspondenceBody ?? defaults.Body,
            },
            SmsBody = smsBody ?? defaults.SmsBody,
            EmailBody = emailBody ?? defaults.EmailBody,
            EmailSubject = emailSubject ?? defaults.Title,
        };
        return contentWrapper;
    }

    /// <summary>
    /// Gets the default texts for the given language.
    /// </summary>
    /// <param name="instanceUrl">The url for the instance</param>
    /// <param name="language">The language to get the texts for</param>
    /// <param name="appName">The name of the app</param>
    /// <param name="appOwner">The owner of the app</param>
    internal static DefaultTexts GetDefaultTexts(string instanceUrl, string language, string appName, string appOwner)
    {
        return language switch
        {
            LanguageConst.En => new DefaultTexts
            {
                Title = $"{appName}: Task for signing",
                Summary = $"Your signature is requested for {appName}.",
                Body =
                    $"You have a task waiting for your signature. [{GetLinkDisplayText(LanguageConst.En)}]({instanceUrl})\n\nIf you have any questions, you can contact {appOwner}.",
                SmsBody = $"Your signature is requested for {appName}. Open your Altinn inbox to proceed.",
                EmailSubject = $"{appName}: Task for signing",
                EmailBody =
                    $"Your signature is requested for {appName}. Open your Altinn inbox to proceed.\n\nIf you have any questions, you can contact {appOwner}.",
            },
            LanguageConst.Nn => new DefaultTexts
            {
                Title = $"{appName}: Oppgåve til signering",
                Summary = $"Signaturen din vert venta for {appName}.",
                Body =
                    $"Du har ei oppgåve som ventar på signaturen din. [{GetLinkDisplayText(LanguageConst.Nn)}]({instanceUrl})\n\nOm du lurer på noko, kan du kontakte {appOwner}.",
                SmsBody = $"Signaturen din vert venta for {appName}. Opne Altinn-innboksen din for å gå vidare.",
                EmailSubject = $"{appName}: Oppgåve til signering",
                EmailBody =
                    $"Signaturen din vert venta for {appName}. Opne Altinn-innboksen din for å gå vidare.\n\nOm du lurer på noko, kan du kontakte {appOwner}.",
            },
            LanguageConst.Nb or _ => new DefaultTexts
            {
                Title = $"{appName}: Oppgave til signering",
                Summary = $"Din signatur ventes for {appName}.",
                Body =
                    $"Du har en oppgave som venter på din signatur. [{GetLinkDisplayText(LanguageConst.Nb)}]({instanceUrl})\n\nHvis du lurer på noe, kan du kontakte {appOwner}.",
                SmsBody = $"Din signatur ventes for {appName}. Åpne Altinn-innboksen din for å fortsette.",
                EmailSubject = $"{appName}: Oppgave til signering",
                EmailBody =
                    $"Din signatur ventes for {appName}. Åpne Altinn-innboksen din for å fortsette.\n\nHvis du lurer på noe, kan du kontakte {appOwner}.",
            },
        };
    }

    internal static NotificationChoice GetNotificationChoice(Notification? notification)
    {
        if (
            notification?.Email is not null
            && notification.Email.EmailAddress is not null
            && notification.Sms is not null
            && notification.Sms.MobileNumber is not null
        )
        {
            return NotificationChoice.SmsAndEmail;
        }

        if (notification?.Email is not null && notification.Email.EmailAddress is not null)
        {
            return NotificationChoice.Email;
        }

        if (notification?.Sms is not null && notification.Sms.MobileNumber is not null)
        {
            return NotificationChoice.Sms;
        }

        return NotificationChoice.None;
    }

    internal enum NotificationChoice
    {
        None,
        Sms,
        Email,
        SmsAndEmail,
    }
}
