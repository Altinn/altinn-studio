using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for handling form data related operations
    /// </summary>
    public interface IInstance
    {
        /// <summary>
        /// Gets the instance information
        /// </summary>
        //object GetInstance(Guid instanceId);

        /// <summary>
        /// Stores the form data
        /// </summary>
        Task<Guid> InstantiateInstance(string applicationId, string instanceOwnerId);
    }
}
