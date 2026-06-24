namespace Altinn.App.Core.Internal.WorkflowEngine.Authentication;

/// <summary>
/// Shared constants for the workflow engine callback authentication scheme.
/// </summary>
internal static class WorkflowCallbackAuthentication
{
    /// <summary>
    /// Name of the authentication scheme that authenticates workflow engine callbacks. The resulting
    /// principal is authenticated but carries no Altinn user/org identity claims — it is bound to an
    /// instance via its <c>jti</c> claim only.
    /// </summary>
    public const string Scheme = "WorkflowEngineCallback";
}
