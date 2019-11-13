using Altinn.App.Common.Interface;
using Altinn.App.Services.Enums;
using Altinn.App.Services.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.App.AppLogic
{
    public class App : IAltinnApp
    {
        public object CreateNewAppModel(string elementType)
        {
            throw new NotImplementedException();
        }

        public Type GetAppModelType(string dataType)
        {
            throw new NotImplementedException();
        }

        public Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState)
        {
            throw new NotImplementedException();
        }
    }
}
