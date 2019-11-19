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
        public object CreateNewAppModel(string classRef)
        {
            Type appType = Type.GetType(classRef);
            return Activator.CreateInstance(appType);
        }

        public Type GetAppModelType(string classRef)
        {
            return Type.GetType(classRef);
        }

        public Task OnEndProcess(string endEvent, Instance instance)
        {
            throw new NotImplementedException();
        }

        public Task OnEndProcessTask(string taskId, Instance instance)
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
