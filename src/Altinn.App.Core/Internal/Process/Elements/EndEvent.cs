using Altinn.App.Core.Internal.Process.Elements.Base;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Class representing the end event of a process
/// </summary>
public class EndEvent : ProcessElement
{
    /// <summary>
    /// String representation of process element type
    /// </summary>
    /// <returns>EndEvent</returns>
    public override string ElementType()
    {
        return "EndEvent";
    }
}
