using System;
using System.Security.Claims;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Repositories.Interface;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    public class PolicyInformationPoint : IPolicyInformationPoint
    {
        private readonly IPolicyInformationRepository _policyInformationRepository;

        /// <summary>
        /// Initializes a new instance of  the <see cref="PolicyInformationPoint"/>
        /// </summary>
        /// <param name="policyInformationRepository">the policy information repository that gets data from the storage</param>
        public PolicyInformationPoint(IPolicyInformationRepository policyInformationRepository)
        {
            _policyInformationRepository = policyInformationRepository;
        }

        /// <inheritdoc/>
        public ClaimsPrincipal GetClaimsPrincipal(XacmlContextRequest request)
        {
            throw new NotImplementedException();
        }
    }
}
