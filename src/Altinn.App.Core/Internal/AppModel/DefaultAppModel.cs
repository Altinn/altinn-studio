using System.Reflection;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.AppModel;

public class DefaultAppModel: IAppModel
{
    private readonly ILogger<DefaultAppModel> _logger;
    
    public DefaultAppModel(ILogger<DefaultAppModel> logger)
    {
        _logger = logger;
    }
    
    public object Create(string classRef)
    {
        _logger.LogInformation($"CreateNewAppModel {classRef}");
        return Activator.CreateInstance(GetModelType(classRef));
    }

    public Type GetModelType(string classRef)
    {
        _logger.LogInformation($"GetAppModelType {classRef}");
        return Assembly.GetEntryAssembly().GetType(classRef);
    }
}