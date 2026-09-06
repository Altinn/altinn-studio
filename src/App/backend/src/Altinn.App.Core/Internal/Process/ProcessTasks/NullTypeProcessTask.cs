namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Null implementation. Used when no other <see cref="IProcessTask"/> can be found
/// </summary>
public class NullTypeProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => "NullType";
}
