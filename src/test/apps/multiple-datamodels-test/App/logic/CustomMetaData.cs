using System.Text.Json;
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
        // The same options the library uses to read applicationmetadata.json, so a round trip is faithful.
        private static readonly JsonSerializerOptions _copyOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            AllowTrailingCommas = true,
        };

        private readonly IAppMetadata _inner;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CustomMetaData(IAppMetadata inner, IHttpContextAccessor httpContextAccessor)
        {
            _inner = inner;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<ApplicationMetadata> GetApplicationMetadata()
        {
            var metadata = await _inner.GetApplicationMetadata();

            // This is a special case copied from the frontend-test app. We only create pdfs if the cookie
            // "createPdf" is set. We do this because PDF generation isn't tested directly in the cypress tests,
            // and it seems like process/next will fail if too many PDFs are generated at the same time.
            var shouldCreatePdf =
                _httpContextAccessor.HttpContext != null
                && _httpContextAccessor.HttpContext.Request.Cookies.ContainsKey("createPdf");

            if (shouldCreatePdf)
            {
                return metadata;
            }

            // The inner service hands out one cached instance, so the per-request change is made on a copy.
            var filtered = DeepCopy(metadata);
            foreach (var dt in filtered.DataTypes)
            {
                dt.EnablePdfCreation = false;
            }

            return filtered;
        }

        public Task<string> GetApplicationXACMLPolicy()
        {
            return _inner.GetApplicationXACMLPolicy();
        }

        public Task<string> GetApplicationBPMNProcess()
        {
            return _inner.GetApplicationBPMNProcess();
        }

        private static ApplicationMetadata DeepCopy(ApplicationMetadata metadata)
        {
            byte[] json = JsonSerializer.SerializeToUtf8Bytes(metadata, _copyOptions);
            return JsonSerializer.Deserialize<ApplicationMetadata>(json, _copyOptions)
                ?? throw new InvalidOperationException("Copying the application metadata returned null.");
        }
    }
}
