using System;
using Altinn.App.Core.Internal.AppModel;
using Microsoft.Extensions.Logging;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.nsm.klareringsportalen.AppLogic
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    /// <summary>
    /// Represents the core logic of an App
    /// </summary>
    public class App : IAppModel
    {
        private readonly ILogger<App> _logger;

        /// <summary>
        /// Initialize a new instance of the <see cref="App"/> class.
        /// </summary>
        /// <param name="logger">A logger from the built in LoggingFactory.</param>
        public App(
            ILogger<App> logger)
        {
            _logger = logger;
        }

        /// <inheritdoc />
        public object Create(string classRef)
        {
            _logger.LogInformation($"CreateNewAppModel {classRef}");

            Type appType = Type.GetType(classRef);
            return Activator.CreateInstance(appType);
        }

        /// <inheritdoc />
        public Type GetModelType(string classRef)
        {
            _logger.LogInformation($"GetAppModelType {classRef}");

            return Type.GetType(classRef);
        }
    }
}
