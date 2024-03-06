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
        return Activator.CreateInstance(GetModelType(classRef))!;
    }

    /// <inheritdoc />
    public Type GetModelType(string classRef)
    {
        _logger.LogInformation($"GetAppModelType {classRef}");
        return Assembly.GetEntryAssembly()!.GetType(classRef, true)!;
    }
}