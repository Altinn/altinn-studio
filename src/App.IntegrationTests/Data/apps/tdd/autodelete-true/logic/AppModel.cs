using System;
using Altinn.App.Core.Internal.AppModel;
using Microsoft.Extensions.Logging;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.autodelete_true
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class AppModel : IAppModel
    {
        private readonly ILogger<AppModel> _logger;
    
        public AppModel(ILogger<AppModel> logger)
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

            return Type.GetType(classRef);
        }
    }
}
