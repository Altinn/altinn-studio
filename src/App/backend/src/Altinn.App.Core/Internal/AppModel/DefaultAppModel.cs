using System.Reflection;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.AppModel;

/// <inheritdoc />
public class DefaultAppModel : IAppModel
{
    private readonly ILogger<DefaultAppModel> _logger;

    /// <summary>
    /// Create with services from Dependency Injcection
    /// </summary>
    public DefaultAppModel(ILogger<DefaultAppModel> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public object Create(string classRef)
    {
        _logger.LogInformation($"CreateNewAppModel {classRef}");
        // ! TODO: Activator.CreateInstance only returns null for Nullable<T> (nullable value types)
        return Activator.CreateInstance(GetModelType(classRef))!;
    }

    /// <inheritdoc />
    public Type GetModelType(string classRef)
    {
        _logger.LogInformation($"GetAppModelType {classRef}");
        var assembly =
            Assembly.GetEntryAssembly()
            ?? throw new Exception("Could not get entry assembly while resolving model type");
        // ! TODO: need some way to handle this for the next major version
        return assembly.GetType(classRef, true)!;
    }
}
