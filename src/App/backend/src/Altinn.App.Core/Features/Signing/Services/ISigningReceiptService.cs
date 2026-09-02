using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Sign;

namespace Altinn.App.Core.Features.Signing.Services;

/// <summary>
/// Interface for sending a correspondence receipt to a signee.
/// </summary>
internal interface ISigningReceiptService
{
    /// <summary>
    /// Sends correspondence to a signee after their signature has been registered. The signed data elements are read
    /// through <paramref name="instanceDataAccessor"/> and attached, and <paramref name="sendersReference"/> becomes
    /// the correspondence's senders reference — key it on the request that produced the signature.
    /// </summary>
    Task<SendCorrespondenceResponse?> SendSignatureReceipt(
        Signee signee,
        IEnumerable<DataElementSignature> dataElementSignatures,
        IInstanceDataAccessor instanceDataAccessor,
        string? language,
        string sendersReference,
        List<AltinnEnvironmentConfig>? correspondenceResources,
        CancellationToken ct
    );
}
