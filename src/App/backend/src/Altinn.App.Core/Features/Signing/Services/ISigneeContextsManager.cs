using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Features.Signing.Services;

internal interface ISigneeContextsManager
{
    /// <summary>
    /// Creates the signee contexts for the current task.
    /// </summary>
    Task<List<SigneeContext>> GenerateSigneeContexts(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    );

    /// <summary>
    /// Gets the signee contexts for the current task.
    /// </summary>
    Task<List<SigneeContext>> GetSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    );
}
