using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// A released app keeps the wire models it shipped with while the engine moves on, so a value the engine adds later
/// must read as Unknown rather than fail the whole read.
/// </summary>
public class TolerantEnumConverterTests
{
    // The engine client reads responses with the web defaults.
    private static readonly JsonSerializerOptions _engineReadOptions = JsonSerializerOptions.Web;

    [Fact]
    public void Workflow_WithStatusesAndARoleThisVersionDoesNotKnow_ReadsThemAsUnknown()
    {
        Guid dependencyId = Guid.NewGuid();
        string json = $$"""
            {
              "databaseId": "{{Guid.NewGuid()}}",
              "operationId": "Process next",
              "idempotencyKey": "key",
              "namespace": "ttd/app",
              "createdAt": "2026-11-11T10:00:00+00:00",
              "overallStatus": "Suspended",
              "role": "Observer",
              "dependencies": { "{{dependencyId}}": "Suspended" },
              "steps": [
                {
                  "operationId": "CommitProcessState",
                  "processingOrder": 0,
                  "command": { "type": "app" },
                  "status": "Paused",
                  "retryCount": 0
                }
              ]
            }
            """;

        WorkflowStatusResponse? workflow = JsonSerializer.Deserialize<WorkflowStatusResponse>(json, _engineReadOptions);

        Assert.NotNull(workflow);
        Assert.Equal(PersistentItemStatus.Unknown, workflow.OverallStatus);
        Assert.Equal(WorkflowRole.Unknown, workflow.Role);
        Assert.Equal(PersistentItemStatus.Unknown, workflow.Steps[0].Status);
        Assert.NotNull(workflow.Dependencies);
        Assert.Equal(PersistentItemStatus.Unknown, workflow.Dependencies[dependencyId]);
    }

    [Fact]
    public void CollectionHead_WithAStatusThisVersionDoesNotKnow_ReadsItAsUnknown()
    {
        string json = $$"""
            {
              "key": "collection",
              "namespace": "ttd/app",
              "createdAt": "2026-11-11T10:00:00+00:00",
              "heads": [{ "databaseId": "{{Guid.NewGuid()}}", "status": "Suspended" }]
            }
            """;

        WorkflowCollectionDetailResponse? collection = JsonSerializer.Deserialize<WorkflowCollectionDetailResponse>(
            json,
            _engineReadOptions
        );

        Assert.NotNull(collection);
        Assert.Equal(PersistentItemStatus.Unknown, Assert.Single(collection.Heads).Status);
    }

    [Fact]
    public void Mailbox_WithAStatusAndReasonThisVersionDoesNotKnow_ReadsThemAsUnknown()
    {
        string json = $$"""
            {
              "id": "{{Guid.NewGuid()}}",
              "namespace": "ttd/app",
              "idempotencyKey": "key",
              "timeout": "01:00:00",
              "deadline": "2026-11-11T11:00:00+00:00",
              "status": "Draining",
              "disposedReason": "Superseded",
              "nextIdx": 0,
              "nextSeq": 0,
              "createdAt": "2026-11-11T10:00:00+00:00"
            }
            """;

        MailboxResponse? mailbox = JsonSerializer.Deserialize<MailboxResponse>(json, _engineReadOptions);

        Assert.NotNull(mailbox);
        Assert.Equal(MailboxStatus.Unknown, mailbox.Status);
        Assert.Equal(MailboxDisposedReason.Unknown, mailbox.DisposedReason);
    }

    [Theory]
    [InlineData("Superseded", MailboxDisposedReason.Unknown)]
    [InlineData("Deadline", MailboxDisposedReason.Deadline)]
    [InlineData(null, null)]
    public void CallbackMailbox_ReadsTheReasonTolerantly_EvenWhenTheAppAddsAStrictEnumConverter(
        string? reason,
        MailboxDisposedReason? expected
    )
    {
        // The callback controller binds the payload with the app's JSON options, and an app may add an enum converter
        // there. A converter in the options takes precedence over the one on the enum, but not over the property's.
        var appOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            Converters = { new JsonStringEnumConverter() },
        };
        string json = $$"""
            { "id": "{{Guid.NewGuid()}}", "seq": 0, "disposedReason": {{JsonSerializer.Serialize(reason)}} }
            """;

        AppCallbackMailbox? mailbox = JsonSerializer.Deserialize<AppCallbackMailbox>(json, appOptions);

        Assert.NotNull(mailbox);
        Assert.Equal(expected, mailbox.DisposedReason);
    }

    [Theory]
    [MemberData(nameof(KnownStatusNames))]
    public void KnownStatus_ReadsAsBefore_InAnyCase(string name)
    {
        PersistentItemStatus expected = Enum.Parse<PersistentItemStatus>(name);

        Assert.Equal(expected, JsonSerializer.Deserialize<PersistentItemStatus>($"\"{name}\"", _engineReadOptions));
        Assert.Equal(
            expected,
            JsonSerializer.Deserialize<PersistentItemStatus>($"\"{name.ToLowerInvariant()}\"", _engineReadOptions)
        );
    }

    public static TheoryData<string> KnownStatusNames() =>
        [.. Enum.GetNames<PersistentItemStatus>().Where(name => name != nameof(PersistentItemStatus.Unknown))];

    [Theory]
    [InlineData("3")]
    [InlineData("Completed, Failed")]
    [InlineData("Unknown")]
    public void NameOfNoKnownStatus_ReadsAsUnknown(string name)
    {
        // Only a member's own name reads as that member. Enum.TryParse would also take a number or a flags list.
        Assert.Equal(
            PersistentItemStatus.Unknown,
            JsonSerializer.Deserialize<PersistentItemStatus>($"\"{name}\"", _engineReadOptions)
        );
    }

    [Fact]
    public void NumberForAStatus_FailsTheRead()
    {
        // The engine writes names, so a number is a changed wire shape rather than a new value.
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<PersistentItemStatus>("3", _engineReadOptions));
    }

    [Fact]
    public void Write_WritesTheMemberName_IncludingUnknown()
    {
        Assert.Equal("\"Waiting\"", JsonSerializer.Serialize(PersistentItemStatus.Waiting, _engineReadOptions));
        Assert.Equal("\"Unknown\"", JsonSerializer.Serialize(PersistentItemStatus.Unknown, _engineReadOptions));
    }

    [Fact]
    public void EveryEnumReadWithTheConverter_HasAnUnknownMember()
    {
        // The converter fails at first use on an enum without one. This finds it before a read does.
        IEnumerable<Type> tolerantEnums = typeof(PersistentItemStatus)
            .Assembly.GetTypes()
            .Where(type =>
                type.IsEnum
                && type.GetCustomAttribute<JsonConverterAttribute>()?.ConverterType is { IsGenericType: true } converter
                && converter.GetGenericTypeDefinition() == typeof(TolerantEnumConverter<>)
            );

        Assert.All(
            tolerantEnums,
            type => Assert.True(Enum.IsDefined(type, "Unknown"), $"{type.Name} has no Unknown member.")
        );
        Assert.NotEmpty(tolerantEnums);
    }
}
