using Altinn.App.Core.Features.Notifications.Exceptions;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Notifications.SecretProvider;

/// <summary>
/// Provides a secret used for signing and validating notification condition endpoint JWT tokens.
/// </summary>
internal interface INotificationConditionSecretProvider
{
    /// <summary>
    /// Gets the secret used for signing JWT tokens for notification condition endpoints.
    /// </summary>
    AppCode GetSigningSecret();

    /// <summary>
    /// Get the currently available secrets for validation.
    /// </summary>
    IReadOnlyList<AppCode> GetValidationSecrets();
}

/// <inheritdoc />
internal sealed class NotificationConditionSecretProvider(IOptionsMonitor<AppCodesSettings> options)
    : INotificationConditionSecretProvider
{
    /// <inheritdoc />
    public AppCode GetSigningSecret()
    {
        var codes = options.CurrentValue.NotificationCallback;
        if (codes is null or { Count: 0 })
            throw new NotificationConditionSecretNotFoundException(
                "AppCodes:Monthly is not configured. Ensure the app-codes secret is mounted."
            );
        return codes[0];
    }

    public IReadOnlyList<AppCode> GetValidationSecrets()
    {
        var codes = options.CurrentValue.NotificationCallback;
        if (codes is null or { Count: 0 })
            throw new NotificationConditionSecretNotFoundException(
                "AppCodes:Monthly is not configured. Ensure the app-codes secret is mounted."
            );
        return codes;
    }
}
