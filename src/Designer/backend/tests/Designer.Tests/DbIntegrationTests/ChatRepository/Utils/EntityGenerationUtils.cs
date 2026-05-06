using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Repository.Models;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityGenerationUtils
{
    public static class Chat
    {
        public const string DefaultOrg = "ttd";
        public const string DefaultCreatedBy = "testUser";

        public static string GenerateUniqueAppName() => $"app-{Guid.NewGuid().ToString("N")[..8]}";

        public static ChatThreadEntity GenerateChatThreadEntity(
            string org = DefaultOrg,
            string app = null,
            string createdBy = DefaultCreatedBy,
            DateTime? createdAt = null
        )
        {
            return new ChatThreadEntity
            {
                Id = Guid.CreateVersion7(),
                Title = $"Thread-{Guid.NewGuid()}",
                Org = org,
                App = app ?? GenerateUniqueAppName(),
                CreatedBy = createdBy,
                CreatedAt = createdAt ?? DateTime.UtcNow,
            };
        }

        public static ChatMessageEntity GenerateChatMessageEntity(
            Guid? threadId = null,
            Role role = Role.User,
            bool? allowAppChanges = null,
            List<string> attachmentFileNames = null,
            List<string> filesChanged = null,
            List<ChatSourceEntity> sources = null,
            DateTime? createdAt = null
        )
        {
            return new ChatMessageEntity
            {
                Id = Guid.CreateVersion7(),
                ThreadId = threadId ?? Guid.NewGuid(),
                CreatedAt = createdAt ?? DateTime.UtcNow,
                Role = role,
                Content = $"Message-{Guid.NewGuid()}",
                AllowAppChanges = allowAppChanges,
                AttachmentFileNames = attachmentFileNames,
                FilesChanged = filesChanged,
                Sources = sources,
            };
        }
    }
}
