using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Resolver for Fiks Arkiv configuration values.
/// </summary>
public interface IFiksArkivConfigResolver
{
    /// <summary>
    /// Settings related to the primary document for the Fiks Arkiv shipment.
    /// </summary>
    FiksArkivDataTypeSettings PrimaryDocumentSettings { get; }

    /// <summary>
    /// Settings related to the attachments for the Fiks Arkiv shipment.
    /// </summary>
    IReadOnlyList<FiksArkivDataTypeSettings> AttachmentSettings { get; }

    /// <summary>
    /// Gets the title of the current application, resolved through applicable text resources if available.
    /// </summary>
    Task<string> GetApplicationTitle(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the archive document metadata (title, etc) using the active instance data accessor.
    /// </summary>
    Task<FiksArkivDocumentMetadata?> GetArchiveDocumentMetadata(
        IInstanceDataAccessor dataAccessor,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the recipient information for the shipment using the active instance data accessor.
    /// </summary>
    Task<FiksArkivRecipient> GetRecipient(
        IInstanceDataAccessor dataAccessor,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the instance reference for the shipment — the instance URL by default, and what lets
    /// someone reading the archived record find the instance it came from. It travels to the archive
    /// inside the arkivmelding via <see cref="GetRecipientParty"/>.
    /// </summary>
    string GetInstanceReference(Instance instance);

    /// <summary>
    /// Gets the recipient party (korrespondansepart).
    /// </summary>
    Korrespondansepart GetRecipientParty(Instance instance, FiksArkivRecipient recipient);

    /// <summary>
    /// Gets the instance owner party (korrespondansepart).
    /// </summary>
    Task<Korrespondansepart?> GetInstanceOwnerParty(Instance instance, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the case file classifications (klassifikasjoner) for the shipment, in the order configured in
    /// <see cref="FiksArkivMetadataSettings.CaseFileClassifications"/>. An entry whose source is
    /// <see cref="FiksArkivClassificationSource.InstanceOwner"/> resolves to the owner recorded on
    /// <paramref name="instance"/>: an organization by its organization number, a person by their national identity
    /// number, titled with the party's registered name when the register knows it. Every other entry is emitted as
    /// configured. Returns an empty list when nothing is configured.
    /// </summary>
    Task<IReadOnlyList<Klassifikasjon>> GetCaseFileClassifications(
        Instance instance,
        CancellationToken cancellationToken = default
    );
}
