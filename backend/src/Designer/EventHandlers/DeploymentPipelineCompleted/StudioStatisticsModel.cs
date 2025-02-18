using System.Collections.Generic;

namespace Altinn.Studio.Designer.EventHandlers.DeploymentPipelineCompleted;

public record StudioStatisticsModel
{
    public string EventName { get; set; }
    public string Environment { get; set; }
    public string Description { get; set; }
    public string Org { get; set; }
    public string App { get; set; }
    public string AppsEnvironment { get; set; }
    public Dictionary<string, string> AdditionalData { get; set; }
}
