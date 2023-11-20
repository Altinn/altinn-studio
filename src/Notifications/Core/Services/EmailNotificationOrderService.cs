#nullable enable
using Altinn.Notifications.Core.Configuration;
using Altinn.Notifications.Core.Models;
using Altinn.Notifications.Core.Models.NotificationTemplate;
using Altinn.Notifications.Core.Models.Orders;
using Altinn.Notifications.Core.Repository.Interfaces;
using Altinn.Notifications.Core.Services.Interfaces;

using Microsoft.Extensions.Options;

namespace Altinn.Notifications.Core.Services;

/// <summary>
/// Implementation of the <see cref="IEmailNotificationOrderService"/>. 
/// </summary>
public class EmailNotificationOrderService : IEmailNotificationOrderService
{
    private readonly IOrderRepository _repository;
    private readonly IGuidService _guid;
    private readonly IDateTimeService _dateTime;
    private readonly string _defaultFromAddress;

    /// <summary>
    /// Initializes a new instance of the <see cref="EmailNotificationOrderService"/> class.
    /// </summary>
    public EmailNotificationOrderService(IOrderRepository repository, IGuidService guid, IDateTimeService dateTime, IOptions<NotificationOrderConfig> config)
    {
        _repository = repository;
        _guid = guid;
        _dateTime = dateTime;
        _defaultFromAddress = config.Value.DefaultEmailFromAddress;
    }

    /// <inheritdoc/>
    public async Task<(NotificationOrder? Order, ServiceError? Error)> RegisterEmailNotificationOrder(NotificationOrderRequest orderRequest)
    {
        Guid orderId = _guid.NewGuid();
        DateTime created = _dateTime.UtcNow();

        var templates = SetFromAddressIfNotDefined(orderRequest.Templates);

        var order = new NotificationOrder(
            orderId,
            orderRequest.SendersReference,
            templates,
            orderRequest.RequestedSendTime,
            orderRequest.NotificationChannel,
            orderRequest.Creator,
            created,
            orderRequest.Recipients);

        NotificationOrder savedOrder = await _repository.Create(order);

        return (savedOrder, null);
    }

    private List<INotificationTemplate> SetFromAddressIfNotDefined(List<INotificationTemplate> templates)
    {
        foreach (var template in templates.OfType<EmailTemplate>().Where(template => string.IsNullOrEmpty(template.FromAddress)))
        {
            template.FromAddress = _defaultFromAddress;
        }

        return templates;
    }
}
