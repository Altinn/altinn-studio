using System.Text.Json.Serialization;
using StorageSignee = Altinn.Platform.Storage.Interface.Models.Signee;

namespace Altinn.App.Core.Features.Signing.Models;

/// <summary>
/// The message the signing endpoint forwards into the open signing round's mailbox: who signs, the language they
/// used, and the data elements they were shown. Intent only — the reply handler produces the evidence.
/// </summary>
internal sealed record SignMessage
{
    internal const int CurrentVersion = 1;

    [JsonPropertyName("version")]
    public required int Version { get; init; }

    [JsonPropertyName("requestId")]
    public required string RequestId { get; init; }

    [JsonPropertyName("signee")]
    public required SigneeInfo Signee { get; init; }

    [JsonPropertyName("language")]
    public string? Language { get; init; }

    [JsonPropertyName("dataElementIds")]
    public required List<string> DataElementIds { get; init; }

    internal sealed record SigneeInfo
    {
        [JsonPropertyName("userId")]
        public string? UserId { get; init; }

        [JsonPropertyName("systemUserId")]
        public Guid? SystemUserId { get; init; }

        [JsonPropertyName("personNumber")]
        public string? PersonNumber { get; init; }

        [JsonPropertyName("organizationNumber")]
        public string? OrganizationNumber { get; init; }

        internal Internal.Sign.Signee ToSignee() =>
            new()
            {
                UserId = UserId,
                SystemUserId = SystemUserId,
                PersonNumber = PersonNumber,
                OrganizationNumber = OrganizationNumber,
            };

        internal StorageSignee ToStorageSignee() =>
            new()
            {
                UserId = UserId,
                SystemUserId = SystemUserId,
                PersonNumber = PersonNumber,
                OrganisationNumber = OrganizationNumber,
            };
    }
}
