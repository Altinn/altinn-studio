using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Interface
{
    /// <summary>
    /// Service interface for AltinnApp context
    /// </summary>
    public interface IAltinnAppContextAccessor
    {
        /// <summary>
        /// Set context
        /// </summary>
        void SetContext(AltinnAppContext appContext);

        /// <summary>
        /// Get context 
        /// </summary>
        AltinnAppContext GetContext();
    }
}
