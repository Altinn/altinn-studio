using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Codelists.Posten.Clients;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Codelists.Posten
{
    public class PostalCodesCodelistsProvider : IAppOptionsProvider
    {
        private readonly IPostalCodesClient _postalCodesClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="PostalCodesCodelistsProvider"/> class.
        /// </summary>
        public PostalCodesCodelistsProvider(IPostalCodesClient postalCodesClient)
        {
            _postalCodesClient = postalCodesClient;
        }

        /// <inheritdoc/>
        public string Id => "poststed";

        /// <inheritdoc/>
        public async Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            List<PostalCodeRecord> postalCodes = await _postalCodesClient.GetPostalCodes();

            var appOptions = new AppOptions
            {
                Options = postalCodes.Select(x => new AppOption() { Value = x.PostCode, Label = x.PostalName }).ToList()
            };

            return appOptions;
        }
    }
}
