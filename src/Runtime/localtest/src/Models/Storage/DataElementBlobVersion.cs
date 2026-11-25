#nullable disable

namespace Altinn.Platform.Storage.Models;

/// <summary>
/// One stored blob version of a data element.
/// </summary>
/// <param name="Id">The id of the blob version.</param>
/// <param name="DataType">
/// The data type of the element the version belongs to, or null when the element is gone and its data type was
/// not kept.
/// </param>
public sealed record DataElementBlobVersion(string Id, string DataType);
