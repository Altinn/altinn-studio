using Altinn.App.Core.Helpers;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Indicates that instance data changed after the unit of work loaded its instance snapshot.
/// </summary>
internal sealed class InstanceDataStaleException : InstanceStateConflictException
{
    public InstanceDataStaleException(PlatformHttpException innerException)
        : base("Instance data changed after it was loaded.", innerException) { }
}
