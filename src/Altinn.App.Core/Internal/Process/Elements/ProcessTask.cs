using System.Xml.Serialization;
using Altinn.App.Core.Internal.Process.Elements.Base;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Class representing the task of a process
/// </summary>
public class ProcessTask : ProcessElement
{
    /// <summary>
    /// Defines the extension elements
    /// </summary>
    [XmlElement("extensionElements")]
    public ExtensionElements? ExtensionElements { get; set; }

    /// <summary>
    /// String representation of process element type
    /// </summary>
    /// <returns>Task</returns>
    public override string ElementType()
    {
        return "Task";
    }
}
