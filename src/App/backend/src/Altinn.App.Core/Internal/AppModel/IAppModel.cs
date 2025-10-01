namespace Altinn.App.Core.Internal.AppModel;

/// <summary>
/// This interface is used to define the methods that are used to instantiate the applications data model.
/// </summary>
public interface IAppModel
{
    /// <summary>
    /// Creates a new Instance of the service model
    /// </summary>
    /// <returns>An instance of the service model</returns>
    public object Create(string classRef);

    /// <summary>
    /// Get the service Type
    /// </summary>
    /// <returns>The Type of the service model for the current service</returns>
    public Type GetModelType(string classRef);
}
