namespace WorkflowEngine.Models;

/// <summary>
/// A request to enqueue one or more task in the process engine.
/// </summary>
/// <param name="Key">The job identifier. A unique-ish keyword describing the job.</param>
/// <param name="InstanceInformation">Information about the instance this job relates to.</param>
/// <param name="Actor">The actor this request is executed on behalf of.</param>
/// <param name="Commands">The individual commands comprising this job.</param>
public record Request(
    string Key,
    InstanceInformation InstanceInformation,
    Actor Actor,
    IEnumerable<CommandRequest> Commands
)
{
    /// <summary>
    /// Determines whether the request is valid.
    /// </summary>
    public bool IsValid() => Commands.Any();
};
