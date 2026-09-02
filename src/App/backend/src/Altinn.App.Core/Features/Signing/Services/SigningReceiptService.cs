using System.Globalization;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Correspondence;
using Altinn.App.Core.Features.Correspondence.Builder;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Signing.Services;

internal sealed class SigningReceiptService(
    ICorrespondenceClient correspondenceClient,
    IHostEnvironment hostEnvironment,
    IAltinnCdnClient altinnCdnClient,
    IAppMetadata appMetadata,
    ITranslationService translationService,
    ILogger<SigningReceiptService> logger,
    Telemetry? telemetry = null
) : ISigningReceiptService
{
    private readonly ICorrespondenceClient _correspondenceClient = correspondenceClient;
    private readonly IHostEnvironment _hostEnvironment = hostEnvironment;
    private readonly IAltinnCdnClient _altinnCdnClient = altinnCdnClient;
    private readonly IAppMetadata _appMetadata = appMetadata;
    private readonly ILogger<SigningReceiptService> _logger = logger;
    private readonly Telemetry? _telemetry = telemetry;

    public async Task<SendCorrespondenceResponse?> SendSignatureReceipt(
        Internal.Sign.Signee signee,
        IEnumerable<DataElementSignature> dataElementSignatures,
        IInstanceDataAccessor instanceDataAccessor,
        string? language,
        string sendersReference,
        List<AltinnEnvironmentConfig>? correspondenceResources,
        CancellationToken ct
    )
    {
        using var activity = _telemetry?.StartSendSignatureReceiptActivity();
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        var (resource, senderOrgNumber, senderDetails, recipient) = await GetCorrespondenceHeaders(
            signee.PersonNumber,
            applicationMetadata,
            correspondenceResources,
            ct
        );

        CorrespondenceContent content = await GetContent(language, applicationMetadata, senderDetails);
        IEnumerable<CorrespondenceAttachment> attachments = await GetCorrespondenceAttachments(
            dataElementSignatures,
            applicationMetadata,
            instanceDataAccessor
        );

        return await _correspondenceClient.Send(
            new SendCorrespondencePayload(
                CorrespondenceRequestBuilder
                    .Create()
                    .WithResourceId(resource)
                    .WithSendersReference(sendersReference)
                    .WithRecipient(recipient)
                    .WithContent(content)
                    .WithAttachments(attachments)
                    .Build(),
                CorrespondenceAuthenticationMethod.Default()
            ),
            ct
        );
    }

    internal async Task<(
        string resource,
        string senderOrgNumber,
        AltinnCdnOrgDetails senderDetails,
        string recipient
    )> GetCorrespondenceHeaders(
        string? recipientNin,
        ApplicationMetadata appMetadata,
        List<AltinnEnvironmentConfig>? correspondenceResources,
        CancellationToken ct
    )
    {
        using var activity = _telemetry?.StartGetCorrespondenceHeadersActivity();
        HostingEnvironment env = AltinnEnvironments.GetHostingEnvironment(_hostEnvironment);
        var resource = AltinnTaskExtension.GetConfigForEnvironment(env, correspondenceResources)?.Value;
        if (string.IsNullOrEmpty(resource))
        {
            throw new ConfigurationException(
                $"No correspondence resource configured for environment {env}, skipping correspondence send"
            );
        }

        string? recipient = recipientNin;
        if (string.IsNullOrEmpty(recipient))
        {
            throw new InvalidOperationException(
                "Signee's national identity number is missing, unable to send correspondence"
            );
        }

        AltinnCdnOrgDetails? senderDetails = await _altinnCdnClient.GetOrgDetails(ct);
        string? senderOrgNumber = senderDetails?.Orgnr;

        if (senderDetails is null || string.IsNullOrEmpty(senderOrgNumber))
        {
            throw new InvalidOperationException(
                $"Error looking up sender's organization number from Altinn CDN, using key `{appMetadata.Org}`"
            );
        }

        return (resource, senderOrgNumber, senderDetails, recipient);
    }

    internal async Task<CorrespondenceContent> GetContent(
        string? requestedLanguage,
        ApplicationMetadata appMetadata,
        AltinnCdnOrgDetails senderDetails
    )
    {
        string? title = null;
        string? summary = null;
        string? body = null;
        string? appName = null;

        string appOwner = senderDetails.Name?.Nb ?? senderDetails.Name?.Nn ?? senderDetails.Name?.En ?? appMetadata.Org;
        string defaultLanguage = LanguageConst.Nb;
        string defaultAppName =
            appMetadata.Title?.GetValueOrDefault(defaultLanguage)
            ?? appMetadata.Title?.FirstOrDefault().Value
            ?? appMetadata.Id;

        string language = requestedLanguage ?? defaultLanguage;

        try
        {
            title = await translationService.TranslateTextKey("signing.correspondence_receipt_title", language);
            summary = await translationService.TranslateTextKey("signing.correspondence_receipt_summary", language);
            body = await translationService.TranslateTextKey("signing.correspondence_receipt_body", language);
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
            appName = defaultAppName;
        }

        var defaults = GetDefaultTexts(language, appName, appOwner);

        CorrespondenceContent content = new()
        {
            Language = LanguageCode<Iso6391>.Parse(language),
            Title = title ?? defaults.Title,
            Summary = summary ?? defaults.Summary,
            Body = body ?? defaults.Body,
        };
        return content;
    }

    /// <summary>
    /// The signed elements' bytes come through the accessor, which serves them from its cache when the caller has
    /// already read them and otherwise with the authentication the accessor is configured with.
    /// </summary>
    internal static async Task<IEnumerable<CorrespondenceAttachment>> GetCorrespondenceAttachments(
        IEnumerable<DataElementSignature> dataElementSignatures,
        ApplicationMetadata appMetadata,
        IInstanceDataAccessor instanceDataAccessor
    )
    {
        IEnumerable<DataElement> signedElements = instanceDataAccessor.Instance.Data.Where(IsSignedDataElement);

        return await Task.WhenAll(
            signedElements.Select(async element =>
            {
                ReadOnlyMemory<byte> data = await instanceDataAccessor.GetBinaryData(element);
                return CorrespondenceAttachmentBuilder
                    .Create()
                    .WithFilename(GetDataElementFilename(element, appMetadata))
                    .WithSendersReference(element.Id)
                    .WithData(new MemoryStream(data.ToArray()))
                    .Build();
            })
        );

        bool IsSignedDataElement(DataElement dataElement) =>
            dataElementSignatures.Any(x => x.DataElementId == dataElement.Id);
    }

    /// <summary>
    /// Note: This method contains only an extremely small list of known mime types.
    /// The aim here is not to be exhaustive, just to cover some common cases.
    /// </summary>
    internal static string GetDataElementFilename(DataElement dataElement, ApplicationMetadata appMetadata)
    {
        if (!string.IsNullOrWhiteSpace(dataElement.Filename))
        {
            return dataElement.Filename;
        }

        DataType? dataType = appMetadata.DataTypes.Find(x => x.Id == dataElement.DataType);

        var mimeType = dataElement.ContentType?.ToLower(CultureInfo.InvariantCulture) ?? string.Empty;
        var formDataExtensions = new[] { ".xml", ".json" };
        var mapping = new Dictionary<string, string>
        {
            ["application/xml"] = ".xml",
            ["text/xml"] = ".xml",
            ["application/pdf"] = ".pdf",
            ["application/json"] = ".json",
        };

        string? extension = mapping.GetValueOrDefault(mimeType);
        string filename = dataElement.DataType;
        if (dataType?.AppLogic is not null && formDataExtensions.Contains(extension))
        {
            filename = $"skjemadata_{filename}";
        }

        return $"{filename}{extension}";
    }

    /// <summary>
    /// Gets the default texts for the given language.
    /// </summary>
    /// <param name="language">The language to get the texts for</param>
    /// <param name="appName">The name of the app</param>
    /// <param name="appOwner">The owner of the app</param>
    internal static DefaultTexts GetDefaultTexts(string language, string appName, string appOwner)
    {
        return language switch
        {
            LanguageConst.En => new DefaultTexts
            {
                Title = $"{appName}: Signature confirmed",
                Summary = $"Your signature has been registered for {appName}.",
                Body =
                    $"The signed documents are attached. They may be downloaded. <br /><br />If you have any questions, you can contact {appOwner}.",
            },
            LanguageConst.Nn => new DefaultTexts
            {
                Title = $"{appName}: Signeringa er stadfesta",
                Summary = $"Du har signert for {appName}.",
                Body =
                    $"Dokumenta du har signert er vedlagde. Dei kan lastast ned om ønskeleg. <br /><br />Om du lurer på noko, kan du kontakte {appOwner}.",
            },
            LanguageConst.Nb or _ => new DefaultTexts
            {
                Title = $"{appName}: Signeringen er bekreftet",
                Summary = $"Du har signert for {appName}.",
                Body =
                    $"Dokumentene du har signert er vedlagt. Disse kan lastes ned om ønskelig. <br /><br />Hvis du lurer på noe, kan du kontakte {appOwner}.",
            },
        };
    }
}
