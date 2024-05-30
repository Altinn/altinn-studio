#nullable disable
using System.Text.Json.Serialization;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;

namespace Altinn.App.Api.Models;

/// <summary>
/// Light weight model representing an instance and it's file scan result status.
/// </summary>
public class InstanceFileScanResult
{
    private readonly InstanceIdentifier _instanceIdentifier;
    private readonly List<DataElementFileScanResult> _dataElements;

    /// <summary>
    /// Initializes a new instance of the <see cref="InstanceFileScanResult"/> class.
    /// </summary>
    public InstanceFileScanResult(InstanceIdentifier instanceIdentifier)
    {
        _instanceIdentifier = instanceIdentifier;
        _dataElements = new List<DataElementFileScanResult>();
    }

    /// <summary>
    /// Instance id
    /// </summary>
    [JsonPropertyName("id")]
    public string Id
    {
        get { return _instanceIdentifier.ToString(); }
    }

    /// <summary>
    /// Contains the aggregated file scan result for an instance.
    /// Infected = If any data elements has a status of Infected
    /// Clean = If all data elements has status Clean
    /// Pending = If all or some are Pending and the rest are Clean
    /// </summary>
    [JsonPropertyName("fileScanResult")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public FileScanResult FileScanResult { get; private set; }

    /// <summary>
    /// File scan result for individual data elements.
    /// </summary>
    [JsonPropertyName("data")]
    public IReadOnlyList<DataElementFileScanResult> DataElements => _dataElements.AsReadOnly();

    /// <summary>
    /// Adds a individual data element file scan result and updates the aggregated file scan result status
    /// </summary>
    public void AddFileScanResult(DataElementFileScanResult dataElementFileScanResult)
    {
        if (dataElementFileScanResult.FileScanResult != FileScanResult.NotApplicable)
        {
            _dataElements.Add(dataElementFileScanResult);

            RecalculateAggregatedStatus();
        }
    }

    private void RecalculateAggregatedStatus()
    {
        FileScanResult = FileScanResult.Clean;

        if (_dataElements.Any(dataElement => dataElement.FileScanResult == FileScanResult.Infected))
        {
            FileScanResult = FileScanResult.Infected;
        }
        // This implicitly states that there are no infected files and that they
        // either have to be clean or pending - so any pending would result in Pending status
        // and if there are no Pending and no Infected they are all Clean.
        else if (_dataElements.Any(dataElement => dataElement.FileScanResult == FileScanResult.Pending))
        {
            FileScanResult = FileScanResult.Pending;
        }
    }
}
