using System.Xml.Serialization;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

/// <summary>
/// Defines an altinn action for a task
/// </summary>
public class AltinnAction
{
    /// <summary>
    /// Initializes a new instance of the <see cref="AltinnAction"/> class
    /// </summary>
    public AltinnAction()
    {
        Value = string.Empty;
        ActionType = ActionType.ProcessAction;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="AltinnAction"/> class with the given ID
    /// </summary>
    /// <param name="id"></param>
    public AltinnAction(string id)
    {
        Value = id;
        ActionType = ActionType.ProcessAction;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="AltinnAction"/> class with the given ID and action type
    /// </summary>
    /// <param name="id"></param>
    /// <param name="actionType"></param>
    public AltinnAction(string id, ActionType actionType)
    {
        Value = id;
        ActionType = actionType;
    }

    /// <summary>
    /// Gets or sets the ID of the action
    /// </summary>
    [XmlText]
    public string Value { get; set; }

    /// <summary>
    /// Gets or sets the type of action
    /// </summary>
    [XmlAttribute("type", Namespace = "http://altinn.no/process")]
    public ActionType ActionType { get; set; }
}

/// <summary>
/// Defines the different types of actions
/// </summary>
public enum ActionType
{
    /// <summary>
    /// The action is a process action
    /// </summary>
    [XmlEnum("processAction")]
    ProcessAction,

    /// <summary>
    /// The action is a generic server action
    /// </summary>
    [XmlEnum("serverAction")]
    ServerAction,
}
