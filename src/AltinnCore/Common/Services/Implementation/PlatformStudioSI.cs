using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using IProfile = AltinnCore.ServiceLibrary.Services.Interfaces.IProfile;
using IRegister = AltinnCore.ServiceLibrary.Services.Interfaces.IRegister;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Studio implementation of the platform service. This is services available in the platform that can be used by apps.
    /// After it is set in production only new methods can be added.
    /// </summary>
    public class PlatformStudioSI : IPlatformServices
    {
        private readonly IRepository _repository;
        private readonly IExecution _execution;
        private readonly IRegister _register;
        private readonly IProfile _profile;

        /// <summary>
        /// Initializes a new instance of the <see cref="PlatformStudioSI" /> class
        /// </summary>
        /// <param name="repositoryService">The repository service</param>
        /// <param name="executionService">The execution service</param>
        /// <param name="register">The register service</param>
        /// <param name="profile">The profile service</param>
        public PlatformStudioSI(IRepository repositoryService, IExecution executionService, IRegister register, IProfile profile)
        {
            _repository = repositoryService;
            _execution = executionService;
            _register = register;
            _profile = profile;
        }

        /// <summary>
        /// The access to the register component through platform services
        /// </summary>
        public IRegister Register
        {
            get { return _register; }
        }

        /// <summary>
        /// The access to the profile component through platform services
        /// </summary>
        public IProfile Profile
        {
            get { return _profile; }
        }
    }
}
