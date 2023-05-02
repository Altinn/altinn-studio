using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Codelists.SSB.Clients
{
    /// <summary>
    /// Http client to get classification codes from SSB.
    /// This class caches the information for performance reasons to avoid costly http calls.
    /// </summary>
    public class ClassificationsHttpClientCached : IClassificationsClient
    {
        /// <inheritdoc/>
        public Task<ClassificationCodes> GetClassificationCodes(int classificationId, string language = "nb", DateOnly? atDate = null, string level = "", string variant = "")
        {
            throw new NotImplementedException();
        }
    }
}
