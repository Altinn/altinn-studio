using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// Implementation of AltinnAppContext serivce
    /// </summary>
    public class AltinnAppContextSI : IAltinnAppContext
    {
        private AltinnAppContext _altinnAppContext;

        /// <inheritdoc/>
        public AltinnAppContext GetContext()
        {
            return _altinnAppContext;
        }

        /// <inheritdoc/>
        public void SetContext(AltinnAppContext appContext)
        {
            _altinnAppContext = appContext;
        }
    }
}
