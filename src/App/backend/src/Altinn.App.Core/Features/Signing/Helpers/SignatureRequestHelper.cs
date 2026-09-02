using System.Globalization;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Models;
using Signee = Altinn.App.Core.Internal.Sign.Signee;

namespace Altinn.App.Core.Features.Signing.Helpers;

/// <summary>
/// Resolves who signs and what is signed from a request for a signature, shared by the <c>sign</c> user action
/// and the signing endpoint.
/// </summary>
internal static class SignatureRequestHelper
{
    internal static async Task<Signee> GetSignee(Authenticated? authentication, string? onBehalfOf)
    {
        switch (authentication)
        {
            case Authenticated.User user:
            {
                UserProfile userProfile = await user.LookupProfile();
                return new Signee
                {
                    UserId = userProfile.UserId.ToString(CultureInfo.InvariantCulture),
                    PersonNumber = userProfile.Party.SSN,
                    OrganizationNumber = onBehalfOf,
                };
            }
            case Authenticated.SystemUser systemUser:
                return new Signee { SystemUserId = systemUser.SystemUserId[0], OrganizationNumber = onBehalfOf };
            default:
                throw new SigningException("Could not get signee");
        }
    }

    /// <summary>
    /// The mailbox idempotency key of a signee: one per signee within a round, so the workflow engine deduplicates
    /// a re-sign by the same signee.
    /// </summary>
    internal static string GetSigneeIdempotencyKey(Signee signee)
    {
        string subject = signee switch
        {
            { UserId: { Length: > 0 } userId } => $"user:{userId}",
            { SystemUserId: { } systemUserId } => $"system:{systemUserId}",
            _ => throw new InvalidOperationException("The signee has neither a user id nor a system user id."),
        };

        return string.IsNullOrEmpty(signee.OrganizationNumber) ? subject : $"{subject}:org:{signee.OrganizationNumber}";
    }

    internal static List<DataType> GetDataTypesToSign(
        ApplicationMetadata appMetadata,
        AltinnSignatureConfiguration signatureConfiguration
    )
    {
        List<string> dataTypeIds = signatureConfiguration.DataTypesToSign ?? [];
        return appMetadata.DataTypes?.Where(d => dataTypeIds.Contains(d.Id, StringComparer.OrdinalIgnoreCase)).ToList()
            ?? throw new ApplicationConfigException(
                "Faulty configuration for signing task. Unable to data types to sign."
            );
    }

    internal static string? GetDataTypeForSignature(
        AltinnSignatureConfiguration signatureConfiguration,
        List<DataElement> dataElements,
        List<DataType>? dataTypesToSign
    )
    {
        string? signatureDataType = signatureConfiguration.SignatureDataType;
        if (dataTypesToSign is null or [] || signatureDataType is null)
        {
            return null;
        }

        bool dataElementMatchExists = dataElements.Any(de =>
            dataTypesToSign.Any(dt => string.Equals(dt.Id, de.DataType, StringComparison.OrdinalIgnoreCase))
        );
        bool allDataTypesAreOptional = dataTypesToSign.All(d => d.MinCount == 0);
        return dataElementMatchExists || allDataTypesAreOptional ? signatureDataType : null;
    }

    internal static List<DataElementSignature> GetDataElementSignatures(
        List<DataElement> dataElements,
        List<DataType> dataTypesToSign
    )
    {
        var connectedDataElements = new List<DataElementSignature>();
        if (dataTypesToSign is null or [])
            return connectedDataElements;
        foreach (var dataType in dataTypesToSign)
        {
            connectedDataElements.AddRange(
                dataElements
                    .Where(d => d.DataType.Equals(dataType.Id, StringComparison.OrdinalIgnoreCase))
                    .Select(d => new DataElementSignature(d.Id))
            );
        }

        return connectedDataElements;
    }
}
