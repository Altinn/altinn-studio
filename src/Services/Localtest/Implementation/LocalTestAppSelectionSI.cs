using Altinn.Authorization.ABAC.Xacml;
using LocalTest.Services.Localtest.Interface;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Services.Localtest.Implementation
{
    public class LocalTestAppSelectionSI : ILocalTestAppSelection
    {
        private readonly string _appRepsitoryBasePath;

        public LocalTestAppSelectionSI(IConfiguration configuration)
        {
            _appRepsitoryBasePath = configuration["LocalPlatformSettings:AppRepositoryBasePath"];
        }

        public string GetAppPath(XacmlContextRequest request)
        {
            string app = request.GetResourceAttributes().Attributes.Where(a => a.AttributeId.ToString() == "urn:altinn:app").Select(a => a.AttributeValues.FirstOrDefault()).FirstOrDefault().Value;

            return GetAppPath(app);
        }

        public string GetAppPath(string app)
        {
            if (string.IsNullOrEmpty(app))
                return null;

            return $"{_appRepsitoryBasePath.TrimEnd('/').TrimEnd('\\')}/{app}/App/";
        }
    }
}
