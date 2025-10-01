using Newtonsoft.Json;

namespace Altinn.App.Core.Models;

/// <summary>
/// Contains options for displaying the instance selection component
/// </summary>
public class InstanceSelection
{
    private int? _defaultSelectedOption;

    /// <summary>
    /// A list of selectable options for amount of rows per page to show for pagination
    /// </summary>
    [JsonProperty(PropertyName = "rowsPerPageOptions")]
    public List<int>? RowsPerPageOptions { get; set; }

    /// <summary>
    /// The default amount of rows per page to show for pagination
    /// </summary>
    [JsonProperty(PropertyName = "defaultRowsPerPage")]
    public int? DefaultRowsPerPage { get; set; }

    /// <summary>
    /// The default selected option for rows per page to show for pagination
    /// </summary>
    [JsonProperty(PropertyName = "defaultSelectedOption")]
    public int? DefaultSelectedOption
    {
        get { return _defaultSelectedOption ?? DefaultRowsPerPage; }
        set { _defaultSelectedOption = value; }
    }

    /// <summary>
    /// The direction of sorting the list of instances, asc or desc
    /// </summary>
    [JsonProperty(PropertyName = "sortDirection")]
    public string? SortDirection { get; set; }
}
