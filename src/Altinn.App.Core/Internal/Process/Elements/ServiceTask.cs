namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Class representing the task of a process
/// </summary>
public class ServiceTask : ProcessTask
{
    /// <summary>
    /// String representation of process element type
    /// </summary>
    /// <returns>Task</returns>
    public override string ElementType()
    {
        return "ServiceTask";
    }
}
