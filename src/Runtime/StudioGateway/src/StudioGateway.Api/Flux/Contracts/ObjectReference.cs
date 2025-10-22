namespace StudioGateway.Api.Flux.Contracts;

/// <summary>
/// Kubernetes ObjectReference identifies an API object.
/// </summary>
public record ObjectReference
{
    /// <summary>
    /// Kind is the type of resource being referenced.
    /// </summary>
    public string? Kind { get; init; }

    /// <summary>
    /// Namespace is the namespace of the resource being referenced.
    /// </summary>
    public string? Namespace { get; init; }

    /// <summary>
    /// Name is the name of the resource being referenced.
    /// </summary>
    public string? Name { get; init; }

    /// <summary>
    /// UID is the unique identifier for the referenced object.
    /// </summary>
    public string? Uid { get; init; }

    /// <summary>
    /// APIVersion defines the versioned schema of this representation of an object.
    /// </summary>
    public string? ApiVersion { get; init; }

    /// <summary>
    /// ResourceVersion contains the object's resource version.
    /// </summary>
    public string? ResourceVersion { get; init; }

    /// <summary>
    /// FieldPath is a path to a specific field in the referenced object.
    /// </summary>
    public string? FieldPath { get; init; }
}
