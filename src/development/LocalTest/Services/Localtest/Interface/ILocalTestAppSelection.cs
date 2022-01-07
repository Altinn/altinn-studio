using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Authorization.ABAC.Xacml;

namespace LocalTest.Services.Localtest.Interface
{
    public interface ILocalTestAppSelection
    {
        string GetAppPath(XacmlContextRequest request);

        string GetAppPath(string app);
    }
}
