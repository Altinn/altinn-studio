using System.Collections.Generic;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace AltinnCore.ServiceLibrary.Services.Interfaces
{
    /// <summary>
    /// Interface describing the services exposed by the platform
    /// </summary>
    public interface IPlatformServices
    {
        /// <summary>
        /// The access to register through platform services
        /// </summary>
        IRegister Register { get; }

        /// <summary>
        /// The access to profile through platform services
        /// </summary>
        IProfile Profile { get; }
    }
}
