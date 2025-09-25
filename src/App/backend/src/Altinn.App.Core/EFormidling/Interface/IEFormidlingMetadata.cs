using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.EFormidling.Interface;

/// <summary>
/// Interface for implementing app specific eFormidling metadata to be sendt.
/// Required when enabling eFormidling for an app.
/// </summary>
[ImplementableByApps]
public interface IEFormidlingMetadata
{
    /// <summary>
    /// Generates the metadata document for the eFormidling shipment. e.g. arkivmelding.
    /// </summary>
    /// <remarks>
    /// The metadata file should be parsed to XML before assigning it to the stream.
    /// </remarks>
    /// <param name="instance">Instance data</param>
    /// <returns>A touple containing the metadata file name and the metadata in a stream.</returns>
    public Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata(Instance instance);
}
