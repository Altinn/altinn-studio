using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal interface IFiksArkivInstanceClient
{
    /// <summary>
    /// Generates a <see cref="AuthenticationMethod.ServiceOwner()"/> JWT token.
    /// </summary>
    internal Task<JwtToken> GetServiceOwnerToken(CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches the instance identified by the given <see cref="InstanceIdentifier"/>.
    /// </summary>
    Task<Instance> GetInstance(InstanceIdentifier instanceIdentifier, CancellationToken cancellationToken = default);

    /// <summary>
    /// Moves the instance to the next process task, with a given action.
    /// </summary>
    Task ProcessMoveNext(
        InstanceIdentifier instanceIdentifier,
        string? action = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Marks the instance as complete by the service owner.
    /// </summary>
    Task MarkInstanceComplete(InstanceIdentifier instanceIdentifier, CancellationToken cancellationToken = default);

    /// <summary>
    /// Inserts binary data of a given type into the instance's data elements.
    /// </summary>
    Task<DataElement> InsertBinaryData<TContent>(
        InstanceIdentifier instanceIdentifier,
        string dataType,
        string contentType,
        string filename,
        TContent content,
        string? generatedFromTask = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes binary data from the instance's data elements.
    /// </summary>
    Task DeleteBinaryData(
        InstanceIdentifier instanceIdentifier,
        Guid dataElementGuid,
        CancellationToken cancellationToken = default
    );
}
