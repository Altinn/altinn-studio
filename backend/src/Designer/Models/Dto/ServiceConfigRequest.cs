using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// DTO representing the service configuration request payload.
/// </summary>
public class ServiceConfigRequest
{
    /// <summary>
    /// Gets or sets the name of the service in multiple languages.
    /// </summary>
    public LocalizedString ServiceName { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier of the service.
    /// </summary>
    public string ServiceId { get; set; }

    /// <summary>
    /// Gets or sets the description of the service in multiple languages.
    /// </summary>
    public LocalizedString Description { get; set; }

    /// <summary>
    /// Gets or sets the description of the rights in multiple languages.
    /// </summary>
    public LocalizedString RightDescription { get; set; }

    /// <summary>
    /// Gets or sets the resource type.
    /// Must be 'altinnapp'.
    /// </summary>
    [RegularExpression("^altinnapp$", ErrorMessage = "ResourceType must be 'altinnapp'.")]
    public string ResourceType { get; set; }

    /// <summary>
    /// Gets or sets the homepage URL for the service.
    /// </summary>
    public string Homepage { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the service is delegable.
    /// </summary>
    public bool IsDelegable { get; set; }

    /// <summary>
    /// Gets or sets the status of the service.
    /// </summary>
    public ServiceStatus Status { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether self-identified users are enabled.
    /// </summary>
    public bool SelfIdentifiedUserEnabled { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether enterprise users are enabled.
    /// </summary>
    public bool EnterpriseUserEnabled { get; set; }

    /// <summary>
    /// Gets or sets the type of users the service is available for.
    /// </summary>
    public AvailableForType AvailableForType { get; set; }

    /// <summary>
    /// Gets or sets the list of contact points associated with the service.
    /// </summary>
    public List<ContactPoint> ContactPoints { get; set; } = new();

    /// <summary>
    /// Gets or sets the list of keywords associated with the service.
    /// </summary>
    public List<Keyword> Keywords { get; set; } = new();

    /// <summary>
    /// Gets or sets a value indicating whether the service is visible.
    /// </summary>
    public bool Visible { get; set; }
}
