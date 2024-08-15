using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Use this in your validators, dataProcessors to get form data from the cache
///
/// Note that this is a scoped service and can't be used in singleton or transient services
/// </summary>
public interface ICachedFormDataAccessor
{
    /// <summary>
    /// Get the deserialized data for a given data element
    /// </summary>
    Task<object> Get(Instance instance, DataElement dataElement);

    /// <summary>
    /// In PATCH requests we need to use the new object for the uploaded data element, instead of fetching from <see cref="IDataClient"/>
    /// </summary>
    void Set(DataElement dataElement, object data);
}
