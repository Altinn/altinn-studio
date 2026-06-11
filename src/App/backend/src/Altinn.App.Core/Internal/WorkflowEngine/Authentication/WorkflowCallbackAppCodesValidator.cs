using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.WorkflowEngine.Authentication;

/// <summary>
/// Fails host startup when no usable <c>WorkflowEngineCallback</c> app-code is configured. The workflow
/// engine is mandatory, so every app must be able to mint and validate callback tokens. In the cloud the
/// operator provisions these codes; locally studioctl supplies a dev code.
/// </summary>
internal sealed class WorkflowCallbackAppCodesValidator : IValidateOptions<AppCodesSettings>
{
    public ValidateOptionsResult Validate(string? name, AppCodesSettings options)
    {
        var codes = options.WorkflowEngineCallback;
        if (codes is null or { Count: 0 })
        {
            return ValidateOptionsResult.Fail(
                "AppCodes:WorkflowEngineCallback is not configured. The workflow engine requires at least one "
                    + "callback code to sign and validate callbacks. Ensure the app-codes secret is mounted (cloud) "
                    + "or that studioctl provides a local code (development)."
            );
        }

        var now = DateTimeOffset.UtcNow;
        if (!codes.Exists(c => c.ExpiresAt > now))
        {
            return ValidateOptionsResult.Fail(
                "AppCodes:WorkflowEngineCallback contains only expired codes. At least one non-expired callback "
                    + "code is required."
            );
        }

        return ValidateOptionsResult.Success;
    }
}
