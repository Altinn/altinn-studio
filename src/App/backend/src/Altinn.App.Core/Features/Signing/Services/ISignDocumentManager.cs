using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Signing.Services;

internal interface ISignDocumentManager
{
    Task<List<SignDocument>> GetSignDocuments(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    );

    Task<List<SigneeContext>> SynchronizeSigneeContextsWithSignDocuments(
        string taskId,
        List<SigneeContext> signeeContexts,
        List<SignDocument> signDocuments,
        CancellationToken ct
    );
}
