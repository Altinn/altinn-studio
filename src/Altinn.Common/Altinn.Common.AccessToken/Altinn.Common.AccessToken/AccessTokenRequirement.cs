using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Common.AccessToken
{
    public class AccessTokenRequirement : IAuthorizationRequirement
    {
        public AccessTokenRequirement()
        {

        }
    }
}
