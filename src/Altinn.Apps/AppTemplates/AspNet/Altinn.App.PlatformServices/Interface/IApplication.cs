using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for retrieving application metadata data related operations
    /// </summary>
    public interface IApplication
    {
        /// <summary>
        /// Gets the application metdata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        Task<Application> GetApplication(string org, string app);
    }
}
