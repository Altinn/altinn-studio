#nullable enable
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace LocalTest.Services.LocalApp.Interface
{
    public interface ILocalApp
    {
        Task<string?> GetXACMLPolicy(string appId);

        Task<Application?> GetApplicationMetadata(string appId);

        Task<Dictionary<string, Application>> GetApplications();
        
        Task<string?> GetAppId();
    }
}