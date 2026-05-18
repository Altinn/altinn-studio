namespace Altinn.Augmenter.Agent.Services.Agent;

/// <summary>
/// A request to an AI agent. The system prompt is loaded from <c>skill.md</c>
/// in the specified <see cref="SkillFolder"/>, with <c>@filename</c> references
/// resolved to sibling files in the same folder.
/// </summary>
public sealed class AgentRequest
{
    /// <summary>
    /// Absolute path to the skill folder. Must contain a <c>skill.md</c> file.
    /// Step classes resolve this from <c>ContentPathsOptions.SkillsRoot</c>.
    /// </summary>
    public required string SkillFolder { get; init; }

    /// <summary>
    /// The user prompt containing the data/context for the agent to process.
    /// </summary>
    public required string UserPrompt { get; init; }
}
