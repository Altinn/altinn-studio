using System;

using Altinn.App.PlatformServices.Options.Altinn2Provider;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.PlatformServices.Options
{
    /// <summary>
    /// class to hold the Extention method for
    /// IServiceCollection to add the AddAltinn2CodeList() method
    /// </summary>
    public static class CommonOptionProviderServiceCollectionExtensions
    {
        /// <summary>
        /// Extention method for IServiceCollection to add the AddAltinn2CodeList() method
        /// <code>
        /// services.AddCommonAppOptions(builder => {
        ///     builder.Add(
        ///         id: "ASF_Land",
        ///         transform: (code) => new (){Value = code.Code, Label=code.Value1},
        ///         // filter: (code) => int.Parse(code.Value3) > 100,
        ///         codeListVersion: 2758,
        ///         metadataApiId: "ASF_land"
        ///     );
        /// });
        /// </code>
        /// </summary>
        public static IServiceCollection AddAltinn2CodeList(this IServiceCollection serviceCollection, Action<Altinn2CodeListOptionsBuilder> builder)
        {
            builder(new Altinn2CodeListOptionsBuilder(serviceCollection));
            return serviceCollection;
        }
    }
}
