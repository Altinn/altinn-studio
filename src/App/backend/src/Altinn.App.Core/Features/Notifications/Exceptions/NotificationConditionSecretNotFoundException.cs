using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Features.Notifications.Exceptions;

internal class NotificationConditionSecretNotFoundException : AltinnException
{
    public NotificationConditionSecretNotFoundException(string message)
        : base(message) { }
}
