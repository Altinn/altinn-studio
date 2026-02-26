using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Extended representation of a status object that holds the process state of an application instance.
/// </summary>
public class AppProcessElementInfo : ProcessElementInfo
{
    /// <summary>
    /// Create a new instance of <see cref="AppProcessElementInfo"/> with no fields set.
    /// </summary>
    public AppProcessElementInfo()
    {
        Actions = new Dictionary<string, bool>();
        UserActions = new List<UserAction>();
    }

    /// <summary>
    /// Create a new instance of <see cref="AppProcessElementInfo"/> with values copied from <see cref="ProcessElementInfo"/>.
    /// </summary>
    /// <param name="processElementInfo">The <see cref="ProcessElementInfo"/> to copy values from.</param>
    public AppProcessElementInfo(ProcessElementInfo processElementInfo)
    {
        Flow = processElementInfo.Flow;
        Started = processElementInfo.Started;
        ElementId = processElementInfo.ElementId;
        Name = processElementInfo.Name;
        AltinnTaskType = processElementInfo.AltinnTaskType;
        Ended = processElementInfo.Ended;
#pragma warning disable CS0618 // Type or member is obsolete
        Validated = processElementInfo.Validated;
#pragma warning restore CS0618 // Type or member is obsolete
        FlowType = processElementInfo.FlowType;
        Actions = new Dictionary<string, bool>();
        UserActions = new List<UserAction>();
    }

    /// <summary>
    /// Actions that can be performed and if the user is allowed to perform them.
    /// </summary>
    [JsonPropertyName(name: "actions")]
    public Dictionary<string, bool>? Actions { get; set; }

    /// <summary>
    /// List of available actions for a task, both user and process tasks
    /// </summary>
    [JsonPropertyName(name: "userActions")]
    public List<UserAction> UserActions { get; set; }

    /// <summary>
    /// Indicates if the user has read access to the task.
    /// </summary>
    [JsonPropertyName(name: "read")]
    public bool HasReadAccess { get; set; }

    /// <summary>
    /// Indicates if the user has write access to the task.
    /// </summary>
    [JsonPropertyName(name: "write")]
    public bool HasWriteAccess { get; set; }

    /// <summary>
    /// Specifies the type of BPMN element.
    /// </summary>
    [JsonPropertyName(name: "elementType")]
    public string? ElementType { get; set; }
}
