namespace Altinn.Notifications.Core.Enums;

/// <summary>
/// Enum describing the various Altinn Service update schemas 
/// </summary>
public enum AltinnServiceUpdateSchema
{
    /// <summary>
    /// Default value for unknown schema
    /// </summary>
    Unkown, 

    /// <summary>
    /// The resource limit exceeded schema
    /// </summary>
    /// <remarks>Data of this schema should be mapped to a <see cref="ResourceLimitExceeded"/> object</remarks>
    ResourceLimitExceeded
}
