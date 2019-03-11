using System;
using System.Collections.Generic;
using System.Text;

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
        object SaveInstance<T>(T dataToSerialize);
    }
}
