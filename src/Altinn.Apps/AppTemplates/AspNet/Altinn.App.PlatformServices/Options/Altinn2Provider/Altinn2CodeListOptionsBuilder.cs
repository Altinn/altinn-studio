#nullable enable
using System;

using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Options;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;

namespace Altinn.App.PlatformServices.Options.Altinn2Provider
{
    /// <summary>
    /// Builder class used in Altinn2CodeListProviderServiceCollectionExtensions
    /// <see cref="Altinn.App.PlatformServices.Options.CommonOptionProviderServiceCollectionExtensions.AddAltinn2CodeList(IServiceCollection, Action{Altinn2CodeListOptionsBuilder})" />
    /// </summary>
    public class Altinn2CodeListOptionsBuilder
    {
        /// <summary>
        /// Service collection to add altinn2 code list providers to
        /// </summary>
        private readonly IServiceCollection _serviceCollection;

        /// <summary>
        /// Constructor that takes a service
        /// </summary>
        public Altinn2CodeListOptionsBuilder(IServiceCollection serviceCollection)
        {
            _serviceCollection = serviceCollection;
        }

        /// <summary>
        /// Add an IOptionsProvider for the specified codeList in the shared Altinn repo
        /// </summary>
        /// <param name="id">
        ///    The id/name that is used in the <c>optionsId</c> parameter in the SelectionComponents (Checkboxes, RadioButtons, Dropdown ...)
        ///    If <paramref name="metadataApiId"/> is null, this is also used for altinn2 code list name
        /// </param>
        /// <param name="transform">Mapping function to get from the altinn2 model to altinn 3 option</param>
        /// <param name="filter">Filter function in case you only want a subset of the altinn2 codelist</param>
        /// <param name="metadataApiId">id for use in altinn2 api (will use <paramref name="id"/>, if this is null)</param>
        /// <param name="codeListVersion">version of the code list in the altinn2 metadata api</param>
        public Altinn2CodeListOptionsBuilder Add(string id, Func<MetadataCodeListCodes, AppOption> transform, Func<MetadataCodeListCodes, bool>? filter = null, string? metadataApiId = null, int? codeListVersion = null)
        {
            _serviceCollection.AddSingleton<IAppOptionsProvider>(sp => new Altinn2CodeListProvider(id, transform, filter, metadataApiId, codeListVersion));
            return this;
        }
    }
}
