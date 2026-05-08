using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Models.Notifications.Future;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Base class for command request payloads.
/// Request payloads are sent from app → engine → app callback.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "$type")]
[JsonDerivedType(typeof(ExecuteServiceTaskPayload), typeDiscriminator: "executeServiceTask")]
[JsonDerivedType(typeof(SaveProcessStateToStoragePayload), typeDiscriminator: "saveProcessStateToStorage")]
[JsonDerivedType(typeof(CommonTaskInitializationPayload), typeDiscriminator: "commonTaskInitialization")]
[JsonDerivedType(typeof(StartTaskLegacyHookPayload), typeDiscriminator: "startTaskLegacyHook")]
[JsonDerivedType(
    typeof(NotifyInstanceOwnerOnInstantiationPayload),
    typeDiscriminator: "notifyInstanceOwnerOnInstantiation"
)]
internal abstract record CommandRequestPayload;

/// <summary>
/// Source-generated JSON serialization context for command payloads.
/// Provides AOT-compatible, high-performance serialization.
/// </summary>
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(CommandRequestPayload))]
[JsonSerializable(typeof(ExecuteServiceTaskPayload))]
[JsonSerializable(typeof(SaveProcessStateToStoragePayload))]
[JsonSerializable(typeof(CommonTaskInitializationPayload))]
[JsonSerializable(typeof(StartTaskLegacyHookPayload))]
[JsonSerializable(typeof(NotifyInstanceOwnerOnInstantiationPayload))]
[JsonSerializable(typeof(InstantiationNotification))]
[JsonSerializable(typeof(InstantiationNotificationReminder))]
[JsonSerializable(typeof(CustomSms))]
[JsonSerializable(typeof(CustomEmail))]
[JsonSerializable(typeof(CustomText))]
internal partial class CommandPayloadJsonContext : JsonSerializerContext { }

/// <summary>
/// Helper methods for serializing/deserializing command payloads.
/// Uses source-generated serialization for better performance and AOT compatibility.
/// </summary>
internal static class CommandPayloadSerializer
{
    public static string? Serialize<T>(T? payload)
        where T : CommandRequestPayload
    {
        return payload is null ? null : JsonSerializer.Serialize(payload, CommandPayloadJsonContext.Default.Options);
    }

    public static T? Deserialize<T>(string? json)
        where T : CommandRequestPayload
    {
        return string.IsNullOrWhiteSpace(json)
            ? null
            : JsonSerializer.Deserialize<T>(json, CommandPayloadJsonContext.Default.Options);
    }
}
