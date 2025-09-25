using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Extensions;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using JsonException = Newtonsoft.Json.JsonException;
using Signee = Altinn.App.Core.Features.Signing.Models.Signee;

namespace Altinn.App.Core.Features.Signing.Services;

internal sealed class SignDocumentManager(
    IAltinnPartyClient altinnPartyClient,
    IAppMetadata appMetadata,
    ILogger<SigningService> logger,
    Telemetry? telemetry = null
) : ISignDocumentManager
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(
        new JsonSerializerOptions
        {
            Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
            PropertyNameCaseInsensitive = true,
            WriteIndented = true,
            ReferenceHandler = ReferenceHandler.Preserve,
            MaxDepth = 16,
        }
    );
    private readonly ILogger<SigningService> _logger = logger;

    public async Task<List<SignDocument>> GetSignDocuments(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    )
    {
        using Activity? activity = telemetry?.StartGetSignDocumentsActivity();
        string signatureDataTypeId =
            signatureConfiguration.SignatureDataType
            ?? throw new ApplicationConfigException("SignatureDataType is not set in the signature configuration.");

        ApplicationMetadata applicationMetadata = await appMetadata.GetApplicationMetadata();
        instanceDataAccessor.OverrideAuthenticationMethodForRestrictedDataTypes(
            applicationMetadata,
            [signatureDataTypeId],
            StorageAuthenticationMethod.ServiceOwner()
        );

        IEnumerable<DataElement> signatureDataElements = instanceDataAccessor.GetDataElementsForType(
            signatureDataTypeId
        );

        try
        {
            SignDocument[] signDocuments = await Task.WhenAll(
                signatureDataElements.Select(signatureDataElement =>
                    DownloadSignDocumentAsync(instanceDataAccessor, signatureDataElement)
                )
            );

            return [.. signDocuments];
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download signature documents.");
            throw;
        }
    }

    /// <summary>
    /// This method exists to ensure we have a SigneeContext for both signees that have been delegated access to sign and signees that have signed using access granted through the policy.xml file.
    /// </summary>
    public async Task<List<SigneeContext>> SynchronizeSigneeContextsWithSignDocuments(
        string taskId,
        List<SigneeContext> signeeContexts,
        List<SignDocument> signDocuments,
        CancellationToken ct
    )
    {
        using var activity = telemetry?.StartSynchronizeSigneeContextsWithSignDocumentsActivity(taskId);
        try
        {
            _logger.LogDebug(
                "Synchronizing signee contexts {SigneeContexts} with sign documents {SignDocuments} for task {TaskId}.",
                JsonSerializer.Serialize(signeeContexts, _jsonSerializerOptions),
                JsonSerializer.Serialize(signDocuments, _jsonSerializerOptions),
                taskId
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to serialize signee contexts or sign documents.");
        }

        // Create a new list with copies of the original signee contexts
        List<SigneeContext> result =
        [
            .. signeeContexts.Select(context => new SigneeContext
            {
                TaskId = context.TaskId,
                Signee = context.Signee,
                SigneeState = context.SigneeState,
                SignDocument = context.SignDocument,
                CommunicationConfig = context.CommunicationConfig,
            }),
        ];

        // Create a copy of the sign documents list to track unmatched documents
        List<SignDocument> unmatchedSignDocuments = [.. signDocuments];

        // OrganizationSignee is most general, so it should be sorted to the end of the list
        SortSigneeContexts(result);

        for (int i = 0; i < result.Count; i++)
        {
            SigneeContext signeeContext = result[i];
            SignDocument? matchedSignDocument = FindMatchingSignDocument(signeeContext, unmatchedSignDocuments);

            if (matchedSignDocument is not null)
            {
                result[i] = await UpdateSigneeContextWithMatchedDocument(signeeContext, matchedSignDocument);
                unmatchedSignDocuments.Remove(matchedSignDocument);
            }
        }

        // Create new contexts for documents that aren't matched with existing signee contexts
        var signeeContextsForUnmatchedDocuments = await CreateSigneeContextsForUnmatchedDocuments(
            taskId,
            unmatchedSignDocuments
        );

        return [.. result, .. signeeContextsForUnmatchedDocuments];
    }

    private async Task<SignDocument> DownloadSignDocumentAsync(
        IInstanceDataAccessor instanceDataAccessor,
        DataElement signatureDataElement
    )
    {
        using var activity = telemetry?.StartDownloadSignDocumentActivity();
        try
        {
            ReadOnlyMemory<byte> data = await instanceDataAccessor.GetBinaryData(signatureDataElement);
            string signDocumentSerialized = Encoding.UTF8.GetString(data.ToArray());

            return JsonSerializer.Deserialize<SignDocument>(signDocumentSerialized, _jsonSerializerOptions)
                ?? throw new JsonException("Could not deserialize signature document.");
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to download signature document for DataElement with ID {DataElementId}.",
                signatureDataElement.Id
            );
            throw;
        }
    }

    private static void SortSigneeContexts(List<SigneeContext> signeeContexts)
    {
        // OrganizationSignee is most general, so it should be sorted to the end of the list
        signeeContexts.Sort(
            (a, b) =>
                a.Signee is OrganizationSignee ? 1
                : b.Signee is OrganizationSignee ? -1
                : 0
        );
    }

    private static SignDocument? FindMatchingSignDocument(SigneeContext signeeContext, List<SignDocument> signDocuments)
    {
        return signDocuments.FirstOrDefault(signDocument =>
        {
            return signeeContext.Signee switch
            {
                PersonSignee personSignee => IsPersonSignDocument(signDocument)
                    && personSignee.SocialSecurityNumber == signDocument.SigneeInfo.PersonNumber,
                PersonOnBehalfOfOrgSignee personOnBehalfOfOrgSignee => IsPersonOnBehalfOfOrgSignDocument(signDocument)
                    && personOnBehalfOfOrgSignee.OnBehalfOfOrg.OrgNumber == signDocument.SigneeInfo.OrganisationNumber
                    && personOnBehalfOfOrgSignee.SocialSecurityNumber == signDocument.SigneeInfo.PersonNumber,
                SystemUserSignee systemUserSignee => IsSystemSignDocument(signDocument)
                    && systemUserSignee.OnBehalfOfOrg.OrgNumber == signDocument.SigneeInfo.OrganisationNumber
                    && systemUserSignee.SystemId.Equals(signDocument.SigneeInfo.SystemUserId),
                OrganizationSignee orgSignee => IsOrgSignDocument(signDocument)
                    && orgSignee.OrgNumber == signDocument.SigneeInfo.OrganisationNumber,
                _ => throw new InvalidOperationException("Signee is not of a supported type."),
            };
        });
    }

    private async Task<SigneeContext> UpdateSigneeContextWithMatchedDocument(
        SigneeContext signeeContext,
        SignDocument matchedSignDocument
    )
    {
        SigneeContext updatedContext = new()
        {
            TaskId = signeeContext.TaskId,
            Signee = signeeContext.Signee,
            SigneeState = signeeContext.SigneeState,
            SignDocument = matchedSignDocument,
            CommunicationConfig = signeeContext.CommunicationConfig,
        };

        if (signeeContext.Signee is OrganizationSignee orgSignee)
        {
            updatedContext = await ConvertOrgSignee(matchedSignDocument, updatedContext, orgSignee);
        }

        return updatedContext;
    }

    private async Task<SigneeContext> ConvertOrgSignee(
        SignDocument signDocument,
        SigneeContext context,
        OrganizationSignee orgSignee
    )
    {
        var signeeInfo = signDocument.SigneeInfo;
        Signee updatedSignee = orgSignee;

        if (!string.IsNullOrEmpty(signeeInfo.PersonNumber))
        {
            updatedSignee = await orgSignee.ToPersonOnBehalfOfOrgSignee(signeeInfo.PersonNumber, LookupParty);
        }
        else if (signeeInfo.SystemUserId.HasValue)
        {
            updatedSignee = orgSignee.ToSystemUserSignee(signeeInfo.SystemUserId.Value);
        }
        else
        {
            throw new InvalidOperationException("Signee is neither a person nor a system user");
        }

        return new SigneeContext
        {
            TaskId = context.TaskId,
            Signee = updatedSignee,
            SigneeState = context.SigneeState,
            SignDocument = context.SignDocument,
            CommunicationConfig = context.CommunicationConfig,
        };
    }

    private async Task<List<SigneeContext>> CreateSigneeContextsForUnmatchedDocuments(
        string taskId,
        List<SignDocument> unmatchedSignDocuments
    )
    {
        try
        {
            // Process all documents in parallel and collect results
            return
            [
                .. await Task.WhenAll(
                    unmatchedSignDocuments.Select(signDocument =>
                        CreateSigneeContextFromSignDocument(taskId, signDocument)
                    )
                ),
            ];
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to create signee contexts for {Count} unmatched documents for task {TaskId}.",
                unmatchedSignDocuments.Count,
                taskId
            );
            throw;
        }
    }

    private async Task<SigneeContext> CreateSigneeContextFromSignDocument(string taskId, SignDocument signDocument)
    {
        _logger.LogDebug(
            "Creating signee context for sign document {SignDocument} for task {TaskId}.",
            JsonSerializer.Serialize(signDocument, _jsonSerializerOptions),
            taskId
        );

        return new SigneeContext
        {
            TaskId = taskId,
            Signee = await From(
                signDocument.SigneeInfo.PersonNumber,
                signDocument.SigneeInfo.OrganisationNumber,
                signDocument.SigneeInfo.SystemUserId,
                LookupParty
            ),
            SigneeState = new SigneeContextState() { IsAccessDelegated = true, HasBeenMessagedForCallToSign = true },
            SignDocument = signDocument,
        };
    }

    private static bool IsPersonOnBehalfOfOrgSignDocument(SignDocument signDocument)
    {
        return !string.IsNullOrEmpty(signDocument.SigneeInfo.PersonNumber)
            && !string.IsNullOrEmpty(signDocument.SigneeInfo.OrganisationNumber);
    }

    private static bool IsPersonSignDocument(SignDocument signDocument)
    {
        return !string.IsNullOrEmpty(signDocument.SigneeInfo.PersonNumber)
            && string.IsNullOrEmpty(signDocument.SigneeInfo.OrganisationNumber);
    }

    private static bool IsOrgSignDocument(SignDocument signDocument)
    {
        return !string.IsNullOrEmpty(signDocument.SigneeInfo.OrganisationNumber);
    }

    private static bool IsSystemSignDocument(SignDocument signDocument)
    {
        return !string.IsNullOrEmpty(signDocument.SigneeInfo.OrganisationNumber)
            && signDocument.SigneeInfo.SystemUserId.HasValue;
    }

    private async Task<Party> LookupParty(PartyLookup partyLookup)
    {
        try
        {
            return await altinnPartyClient.LookupParty(partyLookup);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Failed to look up party.");
            throw new SigningException("Failed to look up party.");
        }
    }
}
