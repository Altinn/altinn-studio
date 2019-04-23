using System.IO;
using System.Text;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using IRegister = AltinnCore.ServiceLibrary.Services.Interfaces.IRegister;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Register service for service development. Uses local disk to store register data
    /// </summary>
    public class RegisterSIPlatform : IRegister
    {
        private readonly IDSF _dsf;
        private readonly IER _er;

        /// <summary>
        /// The access to the dsf component through register services
        /// </summary>
        public IDSF DSF
        {
            get { return _dsf; }
            protected set { }
        }

        /// <summary>
        /// The access to the er component through register services
        /// </summary>
        public IER ER
        {
            get { return _er; }
            protected set { }
        }

    }
}
