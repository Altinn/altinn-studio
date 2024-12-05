using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Defines the type of external reference.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CorrespondenceReferenceType
{
    /// <summary>
    /// A generic reference.
    /// </summary>
    Generic,

    /// <summary>
    /// A reference to an Altinn app instance.
    /// </summary>
    AltinnAppInstance,

    /// <summary>
    /// A reference to an Altinn broker file transfer.
    /// </summary>
    AltinnBrokerFileTransfer,

    /// <summary>
    /// A reference to a Dialogporten dialog ID.
    /// </summary>
    DialogportenDialogId,

    /// <summary>
    /// A reference to a Dialogporten process ID.
    /// </summary>
    DialogportenProcessId,
}
