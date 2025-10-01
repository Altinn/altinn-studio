using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// The status of a correspondence.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CorrespondenceStatus
{
    /// <summary>
    /// Correspondence has been initialised.
    /// </summary>
    Initialized,

    /// <summary>
    /// Correspondence is ready for publish, but not available for recipient.
    /// </summary>
    ReadyForPublish,

    /// <summary>
    /// Correspondence has been published, and is available for recipient.
    /// </summary>
    Published,

    /// <summary>
    /// Correspondence fetched by recipient.
    /// </summary>
    Fetched,

    /// <summary>
    /// Correspondence read by recipient.
    /// </summary>
    Read,

    /// <summary>
    /// Recipient has replied to the correspondence.
    /// </summary>
    Replied,

    /// <summary>
    /// Correspondence confirmed by recipient.
    /// </summary>
    Confirmed,

    /// <summary>
    /// Correspondence has been purged by recipient.
    /// </summary>
    PurgedByRecipient,

    /// <summary>
    /// Correspondence has been purged by Altinn.
    /// </summary>
    PurgedByAltinn,

    /// <summary>
    /// Correspondence has been archived.
    /// </summary>
    Archived,

    /// <summary>
    /// Recipient has opted out of digital communication in KRR.
    /// </summary>
    Reserved,

    /// <summary>
    /// Correspondence has failed.
    /// </summary>
    Failed,
}
