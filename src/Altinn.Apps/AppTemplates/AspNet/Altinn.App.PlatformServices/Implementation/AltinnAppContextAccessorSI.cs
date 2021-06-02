using System;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// Implementation of AltinnAppContext serivce
    /// </summary>
    public class AltinnAppContextAccessorSI : IAltinnAppContextAccessor
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
            if (_altinnAppContext != null)
            {
                throw new ApplicationException("AltinnAppContext overwriting");
            }

            _altinnAppContext = appContext;
        }
    }
}
