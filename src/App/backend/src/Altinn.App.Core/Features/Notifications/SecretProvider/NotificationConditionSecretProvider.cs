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
    /// Gets the secret used for signing JWT tokens for notification condition endpoints: the code
    /// <see cref="AppCodeRotation.SelectSigningCode"/> picks, so that every pod knows it before any pod signs with it.
    /// </summary>
    AppCode GetSigningSecret();

    /// <summary>
    /// Get the currently available secrets for validation.
    /// </summary>
    IReadOnlyList<AppCode> GetValidationSecrets();
}

/// <inheritdoc />
internal sealed class NotificationConditionSecretProvider(
    IOptionsMonitor<AppCodesSettings> options,
    TimeProvider? timeProvider = null
) : INotificationConditionSecretProvider
{
    private readonly TimeProvider _timeProvider = timeProvider ?? TimeProvider.System;

    /// <inheritdoc />
    public AppCode GetSigningSecret()
    {
        var codes = options.CurrentValue.NotificationCallback;
        if (codes is null or { Count: 0 })
            throw new NotificationConditionSecretNotFoundException(
                "AppCodes:Monthly is not configured. Ensure the app-codes secret is mounted."
            );
        return AppCodeRotation.SelectSigningCode(codes, _timeProvider.GetUtcNow())
            ?? throw new NotificationConditionSecretNotFoundException(
                "AppCodes:NotificationCallback contains only expired codes. At least one non-expired code is "
                    + "required to sign notification condition tokens."
            );
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
