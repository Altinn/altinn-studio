using Altinn.App.Common.Interface;
using Altinn.App.Services.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;
using System.Threading.Tasks;

namespace Altinn.App.Common.Implementation
{
    public class AppBase : IAltinnApp
    {
        public object CreateNewAppModel(string dataType)
        {
            throw new NotImplementedException();
        }

        public Task OnEndProcess(string endEvent, Instance instance)
        {
            throw new NotImplementedException();
        }

        public Task OnEndProcessTask(string taskId, Instance instance)
        {
            throw new NotImplementedException();
        }

        public Type GetAppModelType(string dataType)
        {
            throw new NotImplementedException();
        }

        public Task OnInstantiate(Instance instance)
        {
            throw new NotImplementedException();
        }

        public Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null)
        {
            throw new NotImplementedException();
        }

        public Task OnStartProcess(string startEvent, Instance instance)
        {
            throw new NotImplementedException();
        }

        public Task OnStartProcessTask(string taskId, Instance instance)
        {
            throw new NotImplementedException();
        }
    }
}
