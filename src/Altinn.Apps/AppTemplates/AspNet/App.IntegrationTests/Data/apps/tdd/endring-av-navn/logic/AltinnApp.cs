using Altinn.App.Common.Implementation;
using Altinn.App.Common.Interface;
using Altinn.App.Services.Enums;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn   
{
    public class AltinnApp : AppBase, IAltinnApp
    {

        public AltinnApp(IExecution executionService, ILogger<AltinnApp> logger) : base(executionService, logger)
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

        public Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null)
        {
            return Task.FromResult(true);
        }
    }
}
