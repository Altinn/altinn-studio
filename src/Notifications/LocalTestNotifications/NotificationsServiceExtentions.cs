using Altinn.Notifications.Core.Configuration;
using Altinn.Notifications.Core.Repository.Interfaces;
using Altinn.Notifications.Core.Services;
using Altinn.Notifications.Core.Services.Interfaces;
using Altinn.Notifications.Extensions;
using Altinn.Notifications.Models;
using Altinn.Notifications.Validators;
using FluentValidation;
using LocalTest.Notifications.Persistence.Repository;

namespace LocalTest.Notifications.LocalTestNotifications;

public static class NotificationsServiceExtentions
{
    public static void AddNotificationServices(this IServiceCollection services, string baseUrl)
    {
        // Notifications services     
        ValidatorOptions.Global.LanguageManager.Enabled = false;
        ResourceLinkExtensions.Initialize(baseUrl);

        services.Configure<NotificationOrderConfig>((c) => c.DefaultEmailFromAddress = "localtest@altinn.no");

        services
            .AddSingleton<IValidator<EmailNotificationOrderRequestExt>, EmailNotificationOrderRequestValidator>()
            .AddSingleton<IOrderRepository, LocalOrderRepository>()
            .AddSingleton<IGuidService, GuidService>()
            .AddSingleton<IDateTimeService, DateTimeService>()
            .AddSingleton<IEmailNotificationOrderService, EmailNotificationOrderService>();
    }
}