using Altinn.App.Common.Interface;
using Altinn.App.Models;
using Altinn.App.Services.Enums;
using Altinn.App.Common.Implementation;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;
using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using Microsoft.Extensions.Logging;

namespace Altinn.App.AppLogic
{
    public class App : AppBase, IAltinnApp
    {
        public App(IExecution executionService, ILogger<App> logger) : base(executionService, logger)
        {
        }

        public object CreateNewAppModel(string classRef)
        {
           Type appType = Type.GetType(classRef);
           return Activator.CreateInstance(appType);
        }

        public Type GetAppModelType(string classRef)
        {
            return Type.GetType(classRef);
        }

        public Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState)
        {
            throw new NotImplementedException();
        }
    }
}
