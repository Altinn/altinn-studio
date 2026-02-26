using System;
using System.Threading.Tasks;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.logic.MetaData
{
    public class CustomMetaData : IAppMetadata
    {
        private readonly AppMetadata _internal;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CustomMetaData(
            IOptions<AppSettings> settings,
            IFrontendFeatures frontendFeatures,
            IServiceProvider serviceProvider,
            IHttpContextAccessor httpContextAccessor
        )
        {
            _internal = new AppMetadata(settings, frontendFeatures, serviceProvider);
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<ApplicationMetadata> GetApplicationMetadata()
        {
            var result = await _internal.GetApplicationMetadata();

            // This is a special case copied from the frontend-test app. We only create pdfs if the cookie
            // "createPdf" is set. We do this because PDF generation isn't tested directly in the cypress tests,
            // and it seems like process/next will fail if too many PDFs are generated at the same time.
            var shouldCreatePdf =
                _httpContextAccessor.HttpContext != null
                && _httpContextAccessor.HttpContext.Request.Cookies.ContainsKey("createPdf");

            if (!shouldCreatePdf)
            {
                foreach (var dt in result.DataTypes)
                {
                    dt.EnablePdfCreation = false;
                }
            }

            return result;
        }

        public Task<string> GetApplicationXACMLPolicy()
        {
            return _internal.GetApplicationXACMLPolicy();
        }

        public Task<string> GetApplicationBPMNProcess()
        {
            return _internal.GetApplicationBPMNProcess();
        }
    }
}
