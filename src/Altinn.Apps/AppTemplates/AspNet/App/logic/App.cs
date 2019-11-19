using Altinn.App.Common.Interface;
using Altinn.App.Models;
using Altinn.App.Services.Enums;
using Altinn.App.Common.Implementation;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;
using System.Threading.Tasks;

namespace Altinn.App.AppLogic
{
    public class App : AppBase, IAltinnApp
    {

        public Type GetAppModelType(string dataType)
        {
            if ("default".Equals(dataType))
            {
                return typeof(Bestilling);
            }

            throw new NotImplementedException();
        }

        public Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState)
        {
            throw new NotImplementedException();
        }
    }
}
