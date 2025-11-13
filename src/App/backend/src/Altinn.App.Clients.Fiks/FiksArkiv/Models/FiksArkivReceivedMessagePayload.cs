using System.Text.Json.Serialization;
using Altinn.App.Clients.Fiks.Extensions;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmeldingkvittering;
using KS.Fiks.Arkiv.Models.V1.Feilmelding;

namespace Altinn.App.Clients.Fiks.FiksArkiv.Models;

/// <summary>
/// Represents the payload of message received from Fiks Arkiv.
/// </summary>
public abstract record FiksArkivReceivedMessagePayload
{
    /// <summary>
    /// The name of the file.
    /// </summary>
    [JsonPropertyName("filename")]
    public string Filename { get; }

    /// <summary>
    /// The content of the file.
    /// </summary>
    [JsonPropertyName("content")]
    public string Content { get; }

    private FiksArkivReceivedMessagePayload(string filename, string content)
    {
        Filename = filename;
        Content = content;
    }

    /// <summary>
    /// Represents a receipt response.
    /// </summary>
    public sealed record Receipt : FiksArkivReceivedMessagePayload
    {
        /// <summary>
        /// The decrypted and deserialized details of the receipt.
        /// </summary>
        [JsonPropertyName("details")]
        public ArkivmeldingKvittering Details { get; }

        internal Receipt(string filename, string content, ArkivmeldingKvittering archiveReceipt)
            : base(filename, content)
        {
            Details = archiveReceipt;
        }
    }

    /// <summary>
    /// Represents an error response.
    /// </summary>
    public sealed record Error : FiksArkivReceivedMessagePayload
    {
        /// <summary>
        /// The decrypted and deserialized error details.
        /// </summary>
        [JsonPropertyName("details")]
        public IReadOnlyList<FeilmeldingBase> Details { get; }

        internal Error(string filename, string content, IEnumerable<FeilmeldingBase?> errorDetails)
            : base(filename, content)
        {
            Details = errorDetails.OfType<FeilmeldingBase>().ToList();
        }
    }

    /// <summary>
    /// Represents an unknown response.
    /// </summary>
    public sealed record Unknown : FiksArkivReceivedMessagePayload
    {
        internal Unknown(string filename, string content)
            : base(filename, content) { }
    };

    /// <summary>
    /// Factory method to create appropriate payload type based on deserialized payload.
    /// </summary>
    public static FiksArkivReceivedMessagePayload Create(string filename, string payload, object? deserializedPayload)
    {
        if (deserializedPayload is ArkivmeldingKvittering archiveReceipt)
        {
            return archiveReceipt.IsErrorResponse()
                ? new Error(filename, payload, [archiveReceipt.MappeFeilet, archiveReceipt.RegistreringFeilet])
                : new Receipt(filename, payload, archiveReceipt);
        }

        if (deserializedPayload is FeilmeldingBase errorDetails)
        {
            return new Error(filename, payload, [errorDetails]);
        }

        return new Unknown(filename, payload);
    }
}
