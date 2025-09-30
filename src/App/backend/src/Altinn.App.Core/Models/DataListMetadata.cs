namespace Altinn.App.Core.Models;

/// <summary>
/// Represents metadata values for a DataList.
/// </summary>
public class DataListMetadata
{
    /// <summary>
    /// Gets or sets the value of the current page to support pagination.
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Gets or sets the total number of pages to support pagination.
    /// </summary>
    public int PageCount { get; set; }

    /// <summary>
    /// Gets or sets the number of objects per page to support pagination.
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Gets or sets the totalt number of items.
    /// </summary>
    public int TotaltItemsCount { get; set; }

    /// <summary>
    /// Gets or sets pagination links.
    /// </summary>
    public List<string> Links { get; set; } = new List<string>();
}
