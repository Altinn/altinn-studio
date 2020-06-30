using Altinn.Platform.Storage.Interface.Models;
using System.Threading.Tasks;

namespace Altinn.App.Services.Interface
{
    public interface IText
    {
        /// <summary>
        /// Get text resource based on id.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="language">Language for the text resource</param>
        /// <returns>The text resource</returns>
        Task<TextResource> GetText(string org, string app, string language);
    }
}
