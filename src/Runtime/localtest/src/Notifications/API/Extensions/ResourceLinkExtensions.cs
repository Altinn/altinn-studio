using Altinn.Notifications.Core.Models.Orders;
using Altinn.Notifications.Models;

namespace Altinn.Notifications.Extensions;

/// <summary>
/// Extension class for ResourceLinks
/// </summary>
public static class ResourceLinkExtensions
{
    private static string? _baseUri;

    /// <summary>
    /// Initializes the ResourceLinkExtensions with the base URI from settings.
    /// </summary>
    /// <remarks>
    /// Should be called during startup to ensure base url is set
    /// </remarks>
    public static void Initialize(string baseUri)
    {
        _baseUri = baseUri;
    }

    /// <summary>
    /// Sets the resource links on an external notification order
    /// </summary>
    /// <exception cref="InvalidOperationException">Exception if class has not been initialized in Program.cs</exception>
    public static void SetResourceLinks(this NotificationOrderExt order)
    {
        if (_baseUri == null)
        {
            throw new InvalidOperationException("ResourceLinkExtensions has not been initialized with the base URI.");
        }

        string self = _baseUri + "/notifications/api/v1/orders/" + order.Id;

        order.Links = new()
        {
            Self = self,
            Status = self + "/status",
        };
    }

    /// <summary>
    /// Gets the self link for the provided notification order
    /// </summary>
    /// <exception cref="InvalidOperationException">Exception if class has not been initialized in Program.cs</exception>
    public static void NotificationSummaryResourceLinks(this NotificationOrderWithStatusExt order)
    {
        if (_baseUri == null)
        {
            throw new InvalidOperationException("ResourceLinkExtensions has not been initialized with the base URI.");
        }

        string baseUri = $"{_baseUri}/notifications/api/v1/orders/{order!.Id}/notifications/";

        NotificationsStatusSummaryExt? summary = order.NotificationsStatusSummary;

        if (summary?.Email != null)
        {
            summary.Email.Links = new()
            {
                Self = baseUri + "email"
            };
        }

        if (summary?.Sms != null)
        {
            summary.Sms.Links = new()
            {
                Self = baseUri + "sms"
            };
        }
    }

    /// <summary>
    /// Gets the self link for the provided notification order
    /// </summary>
    /// <exception cref="InvalidOperationException">Exception if class has not been initialized in Program.cs</exception>
    public static string GetSelfLinkFromOrderId(this Guid? orderId)
    {
        if (_baseUri == null)
        {
            throw new InvalidOperationException("ResourceLinkExtensions has not been initialized with the base URI.");
        }

        if (orderId == null)
        {
            return string.Empty;
        }

        return _baseUri + "/notifications/api/v1/orders/" + orderId.ToString();
    }
}
