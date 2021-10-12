using Altinn.Authorization.ABAC.Xacml;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Services.Localtest.Interface
{
    public interface ILocalTestAppSelection
    {
        public string GetAppPath(XacmlContextRequest request);

        public string GetAppPath(string app);
    }
}
