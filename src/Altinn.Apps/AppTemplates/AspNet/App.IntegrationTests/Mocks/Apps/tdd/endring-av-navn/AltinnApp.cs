using Altinn.App.Common.Interface;
using Altinn.App.Services.Enums;
using Altinn.App.Services.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn   
{
    public class AltinnApp : IAltinnApp
    {
        public object CreateNewAppModel(string dataModel)
        {
            return new Skjema();
        }

        public Type GetAppModelType(string dataType)
        {
            return typeof(Skjema);
        }

        public Task<bool> RunAppEvent(AppEventType appEvent, object model)
        {
            return Task.FromResult(true);
        }
    }
}
