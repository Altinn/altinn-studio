namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// The developer's answer when the assistant asks for permission to change the app.
/// </summary>
/// <param name="RequestId">The permission request that the developer answers.</param>
/// <param name="Granted">Whether the developer allows the change.</param>
public sealed record AssistantPermissionResponseRequest(string RequestId, bool Granted);
