using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Helpers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Configuration.Extensions
{
    public static class ServiceCollectionExtensions
    {

        /// <summary>
        /// Registers all settings that implement or inherit from the marker type.
        /// Settings configuration will be read from the configuration, and the settings section name will be the same as the class name.
        /// It will register the settings as a scoped service.
        /// </summary>
        /// <param name="services">The <see cref="IServiceCollection"/> to add the service to.</param>
        /// <param name="configuration">An <see cref="IConfiguration"/> holding the configuration of the app.</param>
        /// <typeparam name="TMarker">The marker type used to identify the services or settings to be registered.</typeparam>
        /// <returns>A reference to this instance after the operation has completed.</returns>
        public static IServiceCollection RegisterSettingsByBaseType<TMarker>(this IServiceCollection services, IConfiguration configuration)
        {
            var typesToRegister = AltinnAssembliesScanner.GetTypesAssignedFrom<TMarker>()
                .Where(type => !type.IsInterface && !type.IsAbstract);

            foreach (var configType in typesToRegister)
            {
                services.RegisterSettings(configType, configuration);
            }

            return services;
        }

        public static IServiceCollection RegisterSettings(this IServiceCollection services, Type optionType, IConfiguration configuration, string section = null)
        {
            Func<IServiceCollection, IConfiguration, string, IServiceCollection> registerSettingsMethodObject = RegisterSettings<object>;
            var genericMethodTemplate = registerSettingsMethodObject.Method.GetGenericMethodDefinition().MakeGenericMethod(optionType);
            var configureSettingsMethodByType = (Func<IServiceCollection, IConfiguration, string, IServiceCollection>)Delegate.CreateDelegate(typeof(Func<IServiceCollection, IConfiguration, string, IServiceCollection>), genericMethodTemplate);

            return configureSettingsMethodByType(services, configuration, section);
        }

        public static IServiceCollection RegisterSettings<TOption>(this IServiceCollection services, IConfiguration configuration, string section = null)
            where TOption : class, new()
        {
            string sectionName = string.IsNullOrWhiteSpace(section) ? typeof(TOption).Name : section;
            ConfigureSettingsTypeBySection<TOption>(services, configuration, sectionName);

            return services;
        }

        public static IServiceCollection ConfigureResourceRegistryIntegrationSettings(
        this IServiceCollection services, IConfigurationSection section)
        {
            IEnumerable<IConfigurationSection> resourceRegistrySettingSections = section.GetChildren();

            foreach (IConfigurationSection settingSection in resourceRegistrySettingSections)
            {
                ResourceRegistryEnvironmentSettings rris = new ResourceRegistryEnvironmentSettings();
                settingSection.Bind(rris);
                rris.Environment = settingSection.Key;
                services.Configure<ResourceRegistryIntegrationSettings>(x => x.Add(rris.Environment.ToLower(), rris));
            }

            return services;
        }

        public static IServiceCollection ConfigureMaskinportenIntegrationSettings(
        this IServiceCollection services, IConfigurationSection section)
        {
            IEnumerable<IConfigurationSection> maskinportenIntegrationSettingSections = section.GetChildren();

            foreach (IConfigurationSection settingSection in maskinportenIntegrationSettingSections)
            {
                MaskinportenClientSettings integrationSettings = new MaskinportenClientSettings();
                settingSection.Bind(integrationSettings);
                integrationSettings.Environment = settingSection.Key;
                services.Configure<ResourceRegistryMaskinportenIntegrationSettings>(x => x.Add(integrationSettings.Environment.ToLower(), integrationSettings));
            }

            return services;
        }

        private static void ConfigureSettingsTypeBySection<TOption>(this IServiceCollection services, IConfiguration configuration, string sectionName)
            where TOption : class, new()
        {
            services.Configure<TOption>(configuration.GetSection(sectionName));
            services.TryAddScoped(typeof(TOption), svc => ((IOptionsSnapshot<object>)svc.GetService(typeof(IOptionsSnapshot<TOption>)))!.Value);
        }

        public static IServiceCollection RegisterSettingsSingleton<TOption>(this IServiceCollection services, IConfiguration configuration, string section = null)
            where TOption : class, new()
        {
            string sectionName = string.IsNullOrWhiteSpace(section) ? typeof(TOption).Name : section;
            ConfigureSettingsTypeBySectionSingleton<TOption>(services, configuration, sectionName);

            return services;
        }

        private static void ConfigureSettingsTypeBySectionSingleton<TOption>(this IServiceCollection services, IConfiguration configuration, string sectionName)
            where TOption : class, new()
        {
            var options = new TOption();
            configuration.GetSection(sectionName).Bind(options);
            services.TryAddSingleton(typeof(TOption), _ => options);
        }

        /// <summary>
        /// Register all the services that implement or inherit from the marker interface.
        /// </summary>
        /// <param name="services">The <see cref="IServiceCollection"/> to add the service to.</param>
        /// <typeparam name="TMarker">The marker type used to identify the services or settings to be registered.</typeparam>
        /// <returns>A reference to this instance after the operation has completed.</returns>
        public static IServiceCollection RegisterSingletonServicesByBaseType<TMarker>(this IServiceCollection services)
        {
            var typesToRegister = AltinnAssembliesScanner.GetTypesAssignedFrom<TMarker>()
                .Where(type => !type.IsInterface && !type.IsAbstract);

            foreach (var serviceType in typesToRegister)
            {
                services.TryAddSingleton(typeof(TMarker), serviceType);
            }

            return services;
        }

    }
}
