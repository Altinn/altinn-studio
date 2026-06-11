using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.WorkflowEngine.Authentication;

/// <summary>
/// Provides the secret(s) used for signing and validating workflow engine callback JWT tokens.
/// </summary>
internal interface IWorkflowCallbackSecretProvider
{
    /// <summary>
    /// Gets the secret used for signing JWT tokens for workflow engine callbacks (the newest available code).
    /// </summary>
    AppCode GetSigningSecret();

    /// <summary>
    /// Gets the currently available secrets for validation (supports rotation).
    /// </summary>
    IReadOnlyList<AppCode> GetValidationSecrets();
}

/// <inheritdoc />
internal sealed class WorkflowCallbackSecretProvider(IOptionsMonitor<AppCodesSettings> options)
    : IWorkflowCallbackSecretProvider
{
    private const string NotConfiguredMessage =
        "AppCodes:WorkflowEngineCallback is not configured. Ensure the app-codes secret is mounted.";

    /// <inheritdoc />
    public AppCode GetSigningSecret()
    {
        var codes = options.CurrentValue.WorkflowEngineCallback;
        if (codes is null or { Count: 0 })
            throw new WorkflowCallbackSecretNotFoundException(NotConfiguredMessage);
        return codes[0];
    }

    /// <inheritdoc />
    public IReadOnlyList<AppCode> GetValidationSecrets()
    {
        var codes = options.CurrentValue.WorkflowEngineCallback;
        if (codes is null or { Count: 0 })
            throw new WorkflowCallbackSecretNotFoundException(NotConfiguredMessage);
        return codes;
    }
}
