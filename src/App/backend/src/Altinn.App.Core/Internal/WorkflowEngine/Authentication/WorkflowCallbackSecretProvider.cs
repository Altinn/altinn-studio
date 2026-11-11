using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.WorkflowEngine.Authentication;

/// <summary>
/// Provides the secret(s) used for signing and validating workflow engine callback JWT tokens.
/// </summary>
internal interface IWorkflowCallbackSecretProvider
{
    /// <summary>
    /// Gets the secret used for signing JWT tokens and callback state for workflow engine callbacks: the code
    /// <see cref="AppCodeRotation.SelectSigningCode"/> picks, so that every pod knows it before any pod signs with it.
    /// </summary>
    AppCode GetSigningSecret();

    /// <summary>
    /// Gets the currently available secrets for validation (supports rotation).
    /// </summary>
    IReadOnlyList<AppCode> GetValidationSecrets();
}

/// <inheritdoc />
internal sealed class WorkflowCallbackSecretProvider(
    IOptionsMonitor<AppCodesSettings> options,
    TimeProvider? timeProvider = null
) : IWorkflowCallbackSecretProvider
{
    private const string NotConfiguredMessage =
        "AppCodes:WorkflowEngineCallback is not configured. Ensure the app-codes secret is mounted.";

    private readonly TimeProvider _timeProvider = timeProvider ?? TimeProvider.System;

    /// <inheritdoc />
    public AppCode GetSigningSecret()
    {
        var codes = options.CurrentValue.WorkflowEngineCallback;
        if (codes is null or { Count: 0 })
            throw new WorkflowCallbackSecretNotFoundException(NotConfiguredMessage);

        // A code may expire while the host is running; never sign with an expired code.
        return AppCodeRotation.SelectSigningCode(codes, _timeProvider.GetUtcNow())
            ?? throw new WorkflowCallbackSecretNotFoundException(
                "AppCodes:WorkflowEngineCallback contains only expired codes. At least one non-expired code is "
                    + "required to sign callback tokens."
            );
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
