using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;

namespace Altinn.App.logic.MetaData
{
    /// <summary>
    /// Wraps the library's <see cref="IAppMetadata"/> and turns off PDF generation unless the request
    /// carries the "createPdf" cookie. See <c>Program.cs</c> for how the wrapper is registered.
    /// </summary>
    public class CustomMetaData : IAppMetadata
    {
        private readonly IAppMetadata _inner;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CustomMetaData(IAppMetadata inner, IHttpContextAccessor httpContextAccessor)
        {
            _inner = inner;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<ApplicationMetadata> GetApplicationMetadata()
        {
            var result = await _inner.GetApplicationMetadata();

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
            return _inner.GetApplicationXACMLPolicy();
        }

        public Task<string> GetApplicationBPMNProcess()
        {
            return _inner.GetApplicationBPMNProcess();
        }
    }
}
