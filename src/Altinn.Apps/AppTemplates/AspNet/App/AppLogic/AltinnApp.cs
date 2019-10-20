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
    public class AltinnApp : IAltinnApp
    {
        public object CreateNewServiceModel(string datammodel)
        {
            throw new NotImplementedException();
        }

        public Type GetAppModelType(string dataType)
        {
            throw new NotImplementedException();
        }

        public Task<bool> RunAppEvent(AppEventType appEvent)
        {
            throw new NotImplementedException();
        }

        public void SetAppModel(object model)
        {
            throw new NotImplementedException();
        }

        public void SetContext(RequestContext requestContext)
        {
            throw new NotImplementedException();
        }

        public void SetContext(RequestContext requestContext, ServiceContext serviceContext, StartServiceModel startServiceModel, ModelStateDictionary modelState)
        {
            throw new NotImplementedException();
        }
    }
}
