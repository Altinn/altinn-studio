using System;
using System.Collections.Generic;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Mvc.Rendering;
using Newtonsoft.Json.Linq;
using IRegister = AltinnCore.ServiceLibrary.Services.Interfaces.IRegister;
using IProfile = AltinnCore.ServiceLibrary.Services.Interfaces.IProfile;

namespace AltinnCore.Common.Services
{
    /// <summary>
    /// This implements the services available in the platform that can be used by services.
    /// After it is set in production only new methods can be added.
    /// </summary>
    public class PlatformServices : IPlatformServices
    {
        private readonly IRepository _repository;
        private readonly IExecution _execution;
        private readonly IRegister _register;

        private readonly IProfile _profile;

        /// <summary>
        /// Initializes a new instance of the <see cref="PlatformServices" /> class
        /// </summary>
        /// <param name="repositoryService">The repository service</param>
        /// <param name="executionService">The execution service</param>
        public PlatformServices(IRepository repositoryService, IExecution executionService)
        {
            _repository = repositoryService;
            _execution = executionService;
        }

        /// <summary>
        /// The access to the register component through platform services
        /// </summary>
        public IRegister Register
        {
            get { return _register; }
            protected set { }
        }

        /// <summary>
        /// The access to the profile component through platform services
        /// </summary>
        /// <value></value>
        public IProfile Profile
        {
            get { return _profile; }
            protected set { }
        }
    }
}
