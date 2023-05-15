using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Extended representation of a status object that holds the process state of an application instance.
/// </summary>
public class AppProcessElementInfo: ProcessElementInfo
{
    /// <summary>
    /// Create a new instance of <see cref="AppProcessElementInfo"/> with no fields set.
    /// </summary>
    public AppProcessElementInfo()
    {
        Actions = new Dictionary<string, bool>();
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
        Validated = processElementInfo.Validated;
        FlowType = processElementInfo.FlowType;
        Actions = new Dictionary<string, bool>();
    }
    /// <summary>
    /// Actions that can be performed and if the user is allowed to perform them.
    /// </summary>
    [JsonPropertyName(name:"actions")]
    public Dictionary<string, bool>? Actions { get; set; }
    
    /// <summary>
    /// Indicates if the user has read access to the task.
    /// </summary>
    [JsonPropertyName(name:"read")]
    public bool HasReadAccess { get; set; }
    
    /// <summary>
    /// Indicates if the user has write access to the task.
    /// </summary>
    [JsonPropertyName(name:"write")]
    public bool HasWriteAccess { get; set; }
}