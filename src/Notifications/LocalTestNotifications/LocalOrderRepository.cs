#nullable enable
using System.Text.Json;

using Altinn.Notifications.Core.Enums;
using Altinn.Notifications.Core.Models.Orders;
using Altinn.Notifications.Core.Repository.Interfaces;

using LocalTest.Configuration;

using Microsoft.Extensions.Options;

namespace LocalTest.Notifications.Persistence.Repository
{
    public class LocalOrderRepository : IOrderRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly JsonSerializerOptions _serializerOptions;

        public LocalOrderRepository(
            IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
            Directory.CreateDirectory(GetNotificationsDbPath());

            _serializerOptions = new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        public Task<NotificationOrder> Create(NotificationOrder order)
        {
            string path = GetOrderPath(order.Id);

            string serializedOrder = JsonSerializer.Serialize(order, _serializerOptions);
            FileInfo file = new FileInfo(path);
            file.Directory?.Create();
            File.WriteAllText(file.FullName, serializedOrder);

            return Task.FromResult(order);
        }

        public Task<NotificationOrder?> GetOrderById(Guid id, string creator)
        {
            throw new NotImplementedException();
        }

        public Task<List<NotificationOrder>> GetOrdersBySendersReference(string sendersReference, string creator)
        {
            throw new NotImplementedException();
        }

        public Task<NotificationOrderWithStatus?> GetOrderWithStatusById(Guid id, string creator)
        {
            throw new NotImplementedException();
        }

        public Task<List<NotificationOrder>> GetPastDueOrdersAndSetProcessingState()
        {
            throw new NotImplementedException();
        }

        public Task SetProcessingStatus(Guid orderId, OrderProcessingStatus status)
        {
            throw new NotImplementedException();
        }

        private string GetOrderPath(Guid orderId)
        {
            return Path.Combine(GetNotificationsDbPath(), "orders", orderId + ".json");
        }

        private string GetNotificationsDbPath()
        {
            return _localPlatformSettings.LocalTestingStorageBasePath + _localPlatformSettings.NotificationsStorageFolder;
        }
    }
}
