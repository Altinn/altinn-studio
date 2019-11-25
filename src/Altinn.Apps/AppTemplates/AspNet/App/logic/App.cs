using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;
using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using Microsoft.Extensions.Logging;
using Altinn.App.Services.Implementation;
using Altinn.App.Service.Interface;
using Altinn.App.Common.Enums;

namespace Altinn.App.AppLogic
{
    public class App : AppBase, IAltinnApp
    {
        private readonly ILogger<App> logger;

        public App(IAppResources appResourcesService, ILogger<App> logger, IData dataService) : base(appResourcesService, logger, dataService)
        {
            this.logger = logger;
        }

        public override object CreateNewAppModel(string classRef)
        {            
            Type appType = Type.GetType(classRef);
            return Activator.CreateInstance(appType);
        }

        public override Type GetAppModelType(string classRef)
        {
            return Type.GetType(classRef);
        }

        public override async Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState)
        {            
            return true;
        }
    }
}
