using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Xacml;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The Policy Retrieval point responsible to find the correct policy
    /// based on the context Request
    /// </summary>
    public class PolicyRetrievalPoint : IPolicyRetrievalPoint
    {
        /// <summary>
        /// Returns a XACML Policy based on the Context Request
        /// </summary>
        /// <param name="request">The context request</param>
        /// <returns></returns>
        public XacmlPolicy GetPolicy(XacmlContextRequest request)
        {
            throw new NotImplementedException();
        }
    }
}
