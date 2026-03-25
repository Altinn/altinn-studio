namespace Altinn.Augmenter.Agent.Services.Agent;

public interface IAgentService
{
    Task<string> RunAsync(AgentRequest request, CancellationToken cancellationToken = default);
}
