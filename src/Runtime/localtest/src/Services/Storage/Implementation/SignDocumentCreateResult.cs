#nullable disable

using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Services;

/// <summary>
/// Result from creating a sign document.
/// </summary>
public sealed record SignDocumentCreateResult(
    bool Created,
    ServiceError ServiceError,
    int? InstanceVersion = null,
    int? ProcessStateVersion = null
)
{
    /// <summary>
    /// Allows existing tuple deconstruction call sites to keep reading the status and error.
    /// </summary>
    public void Deconstruct(out bool created, out ServiceError serviceError)
    {
        created = Created;
        serviceError = ServiceError;
    }
}
