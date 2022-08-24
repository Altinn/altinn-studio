using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// ITextResourceService
    /// </summary>
    public interface ILanguagesService
    {
        /// <summary>
        /// Returns all languages that exists in a specific repositry for a
        /// specific organization by reading the part of all the filenames that
        /// identifies the language under the Texts-directory.
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="repo">Repository</param>
        /// <param name="developer">Username of developer</param>
        public List<string> GetLanguages(string org, string repo, string developer);
    }
}
