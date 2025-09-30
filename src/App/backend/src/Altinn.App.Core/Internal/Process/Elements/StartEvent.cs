using Altinn.App.Core.Internal.Process.Elements.Base;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Class representing the start event of a process
/// </summary>
public class StartEvent : ProcessElement
{
    /// <summary>
    /// String representation of process element type
    /// </summary>
    /// <returns>StartEvent</returns>
    public override string ElementType()
    {
        return "StartEvent";
    }
}
