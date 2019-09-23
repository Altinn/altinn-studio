using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for retrieving application metadata data related operations
    /// </summary>
    public interface IApplication
    {
        /// <summary>
        /// Gets the application metdata
        /// </summary>
        /// <param name="org">the organisation</param>
        /// <param name="app">the application</param>
        Task<Application> GetApplication(string org, string app);
    }
}
