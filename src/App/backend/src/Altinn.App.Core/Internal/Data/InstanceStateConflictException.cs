namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Indicates that instance data changed after the instance snapshot was loaded.
/// </summary>
internal abstract class InstanceStateConflictException : Exception
{
    protected InstanceStateConflictException(string message, Exception? innerException = null)
        : base(message, innerException) { }
}
