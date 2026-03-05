#nullable disable
namespace Altinn.Studio.Designer.Services.Models;

public class DeployPipelineQueueRequest
{
    public string Org { get; set; }
    public string App { get; set; }
    public string Environment { get; set; }
    public string TagName { get; set; }
    public string AppCommitId { get; set; }
    public string Hostname { get; set; }
    public string AppDeployToken { get; set; }
    public string GiteaEnvironment { get; set; }
    public string AltinnStudioHostname { get; set; }
    public bool UseGitOpsDefinition { get; set; }
    public bool ShouldPushSyncRootImage { get; set; }
    public string TraceParent { get; set; }
    public string TraceState { get; set; }
}
