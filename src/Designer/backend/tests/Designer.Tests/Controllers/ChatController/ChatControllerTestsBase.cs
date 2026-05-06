using System;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ChatController;

public abstract class ChatControllerTestsBase<TTestClass>
    : DbDesignerEndpointsTestsBase<TTestClass>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>
    where TTestClass : class
{
    protected const string Org = "ttd";
    protected const string App = "test-app";
    protected const string Developer = "testUser";

    protected static string ThreadsUrl => $"designer/api/{Org}/{App}/chat/threads";

    protected static string ThreadUrl(Guid threadId) => $"designer/api/{Org}/{App}/chat/threads/{threadId}";

    protected static string MessagesUrl(Guid threadId) => $"designer/api/{Org}/{App}/chat/threads/{threadId}/messages";

    protected static string MessageUrl(Guid threadId, Guid messageId) =>
        $"designer/api/{Org}/{App}/chat/threads/{threadId}/messages/{messageId}";

    protected ChatControllerTestsBase(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    protected async Task<ChatThreadDbModel> SeedThreadAsync(string title = "Test thread", string createdBy = Developer)
    {
        var thread = new ChatThreadDbModel
        {
            Id = Guid.CreateVersion7(),
            Org = Org,
            App = App,
            CreatedBy = createdBy,
            Title = title,
            CreatedAt = DateTime.UtcNow,
        };
        await DesignerDbFixture.DbContext.ChatThreads.AddAsync(thread);
        await DesignerDbFixture.DbContext.SaveChangesAsync();
        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        return thread;
    }

    protected async Task<ChatMessageDbModel> SeedMessageAsync(Guid threadId, string content = "Test message")
    {
        var message = new ChatMessageDbModel
        {
            Id = Guid.CreateVersion7(),
            ThreadId = threadId,
            CreatedAt = DateTime.UtcNow,
            Role = Role.User,
            Content = content,
        };
        await DesignerDbFixture.DbContext.ChatMessages.AddAsync(message);
        await DesignerDbFixture.DbContext.SaveChangesAsync();
        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        return message;
    }

    protected StringContent CreateJsonContent<T>(T value) =>
        new(JsonSerializer.Serialize(value, JsonSerializerOptions), Encoding.UTF8, MediaTypeNames.Application.Json);

    protected async Task<T> DeserializeAsync<T>(HttpContent content)
    {
        var rawContent = await content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<T>(rawContent, JsonSerializerOptions);
        Assert.NotNull(result);
        return result!;
    }
}
