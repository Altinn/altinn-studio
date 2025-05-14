using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.AccessManagement.Exceptions;
using Altinn.App.Core.Internal.AccessManagement.Models.Shared;

namespace Altinn.App.Core.Internal.AccessManagement.Models;

// add params to summary
/// <summary>
/// Represents a request to delegate rights to a user.
/// </summary>\
public sealed class DelegationRequest
{
    /// <summary>
    /// Gets or sets the delegator.
    /// </summary>
    [JsonPropertyName("from")]
    public DelegationParty? From { get; set; }

    /// <summary>
    /// Gets or sets the delegatee.
    /// </summary>
    [JsonPropertyName("to")]
    public DelegationParty? To { get; set; }

    /// <summary>
    /// Gets or sets the resource id.
    /// </summary>
    [JsonPropertyName("resourceId")]
    public required string ResourceId { get; set; }

    /// <summary>
    /// Gets or sets the instance id.
    /// </summary>
    [JsonPropertyName("instanceId")]
    public required string InstanceId { get; set; }

    /// <summary>
    /// Gets or sets the rights.
    /// </summary>
    [JsonPropertyName("rights")]
    public List<RightRequest> Rights { get; set; } = [];

    /// <summary>
    /// Converts a <see cref="DelegationRequest"/> to a <see cref="AppsInstanceDelegationRequestDto"/>
    /// </summary>
    public static AppsInstanceDelegationRequestDto ConvertToDto(DelegationRequest delegation)
    {
        return new AppsInstanceDelegationRequestDto
        {
            From = new DelegationParty
            {
                Type = delegation.From is not null
                    ? delegation.From.Type
                    : throw new AccessManagementArgumentException("From is required"),
                Value = delegation.From.Value,
            },
            To = new DelegationParty
            {
                Type = delegation.To is not null
                    ? delegation.To.Type
                    : throw new AccessManagementArgumentException("To is required"),
                Value = delegation.To.Value,
            },
            Rights = delegation
                .Rights.Select(r => new RightDto
                {
                    Resource = r.Resource.Select(rr => new Resource { Type = rr.Type, Value = rr.Value }).ToList(),
                    Action = new AltinnAction
                    {
                        Type = r.Action is not null
                            ? r.Action.Type
                            : throw new AccessManagementArgumentException("Action is required"),
                        Value = r.Action.Value,
                    },
                })
                .ToList(),
        };
    }
}

/// <summary>
/// Represents the rights to delegate.
/// </summary>
public class RightRequest
{
    /// <summary>
    /// Gets or sets the resource.
    /// </summary>
    [JsonPropertyName("resource")]
    public List<Resource> Resource { get; set; } = [];

    /// <summary>
    /// Gets or sets the action.
    /// </summary>
    [JsonPropertyName("action")]
    public AltinnAction? Action { get; set; }

    /// <summary>
    /// Gets or sets the task id.
    /// </summary>
    [JsonPropertyName("taskId")]
    public string? TaskId { get; set; }
}
