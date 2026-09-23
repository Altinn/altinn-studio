using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Features.Signing.Helpers;

/// <summary>Signing's call-to-action key contract, retained for in-flight workflows.</summary>
internal static class SigningIdempotencyKey
{
    internal static Guid ForCallToAction(Guid workflowId, Guid stepId, string signeeIdentity) =>
        WorkflowStepIdempotencyKey.Create(workflowId, stepId, "call-to-action", signeeIdentity);
}
