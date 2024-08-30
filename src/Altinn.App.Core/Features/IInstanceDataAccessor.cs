using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Service for accessing data from other data elements in the
/// </summary>
public interface IInstanceDataAccessor
{
    /// <summary>
    /// The instance that the accessor can access data for.
    /// </summary>
    Instance Instance { get; }

    /// <summary>
    /// Get the actual data represented in the data element.
    /// </summary>
    /// <returns>The deserialized data model for this data element or a stream for binary elements</returns>
    Task<object> GetData(DataElementId dataElementId);

    /// <summary>
    /// Get actual data represented, when there should only be a single element of this type.
    /// </summary>
    Task<object?> GetSingleDataByType(string dataType);
}
