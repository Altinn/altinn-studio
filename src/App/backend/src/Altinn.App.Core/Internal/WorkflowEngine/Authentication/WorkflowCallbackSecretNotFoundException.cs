using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Internal.WorkflowEngine.Authentication;

/// <summary>
/// Thrown when no <c>WorkflowEngineCallback</c> app-code is available for signing or validating
/// workflow engine callback tokens.
/// </summary>
internal sealed class WorkflowCallbackSecretNotFoundException : AltinnException
{
    public WorkflowCallbackSecretNotFoundException(string message)
        : base(message) { }
}
