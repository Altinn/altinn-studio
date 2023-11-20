#nullable enable
using Altinn.Notifications.Core.Enums;
using Altinn.Notifications.Core.Models;
using Altinn.Notifications.Core.Models.Address;
using Altinn.Notifications.Core.Models.NotificationTemplate;
using Altinn.Notifications.Core.Models.Orders;
using Altinn.Notifications.Extensions;
using Altinn.Notifications.Models;

namespace Altinn.Notifications.Mappers;

/// <summary>
/// Mapper for <see cref="EmailNotificationOrderRequestExt"/>
/// </summary>
public static class OrderMapper
{
    /// <summary>
    /// Maps a <see cref="EmailNotificationOrderRequestExt"/> to a <see cref="NotificationOrderRequest"/>
    /// </summary>
    public static NotificationOrderRequest MapToOrderRequest(this EmailNotificationOrderRequestExt extRequest, string creator)
    {
        var emailTemplate = new EmailTemplate(null, extRequest.Subject, extRequest.Body, (EmailContentType)extRequest.ContentType);

        var recipients = new List<Recipient>();

        recipients.AddRange(
            extRequest.Recipients.Select(r => new Recipient(string.Empty, new List<IAddressPoint>() { new EmailAddressPoint(r.EmailAddress!) })));

        return new NotificationOrderRequest(
            extRequest.SendersReference,
            creator,
            new List<INotificationTemplate>() { emailTemplate },
            extRequest.RequestedSendTime,
            NotificationChannel.Email,
            recipients);
    }

    /// <summary>
    /// Maps a <see cref="NotificationOrder"/> to a <see cref="NotificationOrderExt"/>
    /// </summary>
    public static NotificationOrderExt MapToNotificationOrderExt(this NotificationOrder order)
    {
        var orderExt = new NotificationOrderExt();

        orderExt.MapBaseNotificationOrder(order);
        orderExt.Recipients = order.Recipients.MapToRecipientExt();

        foreach (var template in order.Templates)
        {
            switch (template.Type)
            {
                case NotificationTemplateType.Email:
                    var emailTemplate = template! as EmailTemplate;

                    orderExt.EmailTemplate = new()
                    {
                        Body = emailTemplate!.Body,
                        FromAddress = emailTemplate.FromAddress,
                        ContentType = (EmailContentTypeExt)emailTemplate.ContentType,
                        Subject = emailTemplate.Subject
                    };

                    break;
                default:
                    break;
            }
        }

        orderExt.SetResourceLinks();
        return orderExt;
    }

    /// <summary>
    /// Maps a <see cref="NotificationOrderWithStatus"/> to a <see cref="NotificationOrderWithStatusExt"/>
    /// </summary>
    public static NotificationOrderWithStatusExt MapToNotificationOrderWithStatusExt(this NotificationOrderWithStatus order)
    {
        var orderExt = new NotificationOrderWithStatusExt();
        orderExt.MapBaseNotificationOrder(order);

        orderExt.ProcessingStatus = new()
        {
            LastUpdate = order.ProcessingStatus.LastUpdate,
            Status = order.ProcessingStatus.Status.ToString(),
            StatusDescription = order.ProcessingStatus.StatusDescription
        };

        if (order.NotificationStatuses.Any())
        {
            orderExt.NotificationsStatusSummary = new();
            foreach (var entry in order.NotificationStatuses)
            {
                NotificationTemplateType notificationType = entry.Key;
                NotificationStatus status = entry.Value;

                switch (notificationType)
                {
                    case NotificationTemplateType.Email:
                        orderExt.NotificationsStatusSummary.Email = new()
                        {
                            Generated = status.Generated,
                            Succeeded = status.Succeeded
                        };
                        break;
                }
            }

            orderExt.NotificationSummaryResourceLinks();
        }

        return orderExt;
    }

    /// <summary>
    /// Maps a list of <see cref="NotificationOrder"/> to a <see cref="NotificationOrderListExt"/>
    /// </summary>
    public static NotificationOrderListExt MapToNotificationOrderListExt(this List<NotificationOrder> orders)
    {
        NotificationOrderListExt ordersExt = new()
        {
            Count = orders.Count
        };

        foreach (NotificationOrder order in orders)
        {
            ordersExt.Orders.Add(order.MapToNotificationOrderExt());
        }

        return ordersExt;
    }

    /// <summary>
    /// Maps a List of <see cref="Recipient"/> to a List of <see cref="RecipientExt"/>
    /// </summary>
    internal static List<RecipientExt> MapToRecipientExt(this List<Recipient> recipients)
    {
        var recipientExt = new List<RecipientExt>();

        recipientExt.AddRange(
            recipients.Select(r => new RecipientExt
            {
                EmailAddress = GetEmailFromAddressList(r.AddressInfo)
            }));

        return recipientExt;
    }

    private static IBaseNotificationOrderExt MapBaseNotificationOrder(this IBaseNotificationOrderExt orderExt, IBaseNotificationOrder order)
    {
        orderExt.Id = order.Id.ToString();
        orderExt.SendersReference = order.SendersReference;
        orderExt.Created = order.Created;
        orderExt.Creator = order.Creator.ShortName;
        orderExt.NotificationChannel = (NotificationChannelExt)order.NotificationChannel;
        orderExt.RequestedSendTime = order.RequestedSendTime;

        return orderExt;
    }

    private static string? GetEmailFromAddressList(List<IAddressPoint> addressPoints)
    {
        var emailAddressPoint = addressPoints
            .Find(a => a.AddressType.Equals(AddressType.Email))
            as EmailAddressPoint;

        return emailAddressPoint?.EmailAddress;
    }
}
