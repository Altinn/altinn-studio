namespace Altinn.Platform.Authorization.Functions.Models;

/// <summary>
/// The type of delegation change event
/// </summary>
public enum DelegationChangeEventType
{
    /// <summary>
    /// Undefined default value
    /// </summary>
    // ReSharper disable UnusedMember.Global
    Undefined = 0,

    /// <summary>
    /// Grant event
    /// </summary>
    Grant = 1,

    /// <summary>
    /// Revoke event
    /// </summary>
    Revoke = 2,

    /// <summary>
    /// Revoke last right event
    /// </summary>
    RevokeLast = 3
}
