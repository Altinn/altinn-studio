using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;

namespace Altinn.App.logic.MetaData
{
    /// <summary>
    /// Wraps the built-in <see cref="IAppMetadata"/> and switches PDF creation off unless the request carries the
    /// "createPdf" cookie. See Program.cs for how it replaces the built-in registration.
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

        public ApplicationMetadata ApplicationMetadata
        {
            get
            {
                var result = _inner.ApplicationMetadata;

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
        }

        public string XacmlPolicy => _inner.XacmlPolicy;

        public string ProcessDefinition => _inner.ProcessDefinition;

        public Task<ApplicationMetadata> GetApplicationMetadata() => Task.FromResult(ApplicationMetadata);

        public Task<string> GetApplicationXACMLPolicy() => _inner.GetApplicationXACMLPolicy();

        public Task<string> GetApplicationBPMNProcess() => _inner.GetApplicationBPMNProcess();
    }
}
