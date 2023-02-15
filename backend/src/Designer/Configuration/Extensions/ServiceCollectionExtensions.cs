using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.DependencyModel;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Configuration.Extensions
{
    public static class ServiceCollectionExtensions
    {
        private const string AltinnAssemblyIdentifier = "Altinn.";
        public static IServiceCollection RegisterSettingsByBaseType<TMarker>(this IServiceCollection services, IConfiguration configuration)
        {
            if (services == null) throw new ArgumentNullException(nameof(services));
            if (configuration == null) throw new ArgumentNullException(nameof(configuration));

            var typesToRegister = GetTypesAssignedFrom<TMarker>()
                .Where(type => !type.IsInterface && !type.IsAbstract);

            foreach (var configType in typesToRegister)
            {
                services.RegisterSettings(configType, configuration);
            }

            return services;
        }

        public static IServiceCollection RegisterSettings(this IServiceCollection services, Type optionType, IConfiguration configuration, string section = null)
        {
            var @delegate = new Func<IServiceCollection, IConfiguration, string, IServiceCollection>(RegisterSettings<object>);
            var genericMethodDefinition = @delegate.Method.GetGenericMethodDefinition();
            var genericMethodTemplate = genericMethodDefinition.MakeGenericMethod(optionType);
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

        private static void ConfigureSettingsTypeBySection<TOption>(this IServiceCollection services, IConfiguration configuration, string sectionName)
            where TOption : class, new()
        {
            services.Configure<TOption>(configuration.GetSection(sectionName));
            services.TryAddScoped(typeof(TOption), svc => ((IOptionsSnapshot<object>)svc.GetService(typeof(IOptionsSnapshot<TOption>))).Value);
        }

        private static IEnumerable<Type> GetTypesAssignedFrom<TAssignedFrom>()
        {
            if (DependencyContext.Default == null)
            {
                throw new InvalidOperationException("PreserveCompilationContext should be set to true.");
            }

            return DependencyContext.Default
                .RuntimeLibraries
                .Where(IsAltinnLibrary)
                .Where(library => library.RuntimeAssemblyGroups.Any())//Project or (nuget)package contains assembly.
                .Select(library => Assembly.Load(new AssemblyName(library.Name)))
                .GetTypesAssignedFrom<TAssignedFrom>();
        }

        private static IEnumerable<Type> GetTypesAssignedFrom<TAssignedFrom>(this IEnumerable<Assembly> assemblies)
        {
            return assemblies.SelectMany(a => a.GetTypesAssignedFrom<TAssignedFrom>());
        }

        private static IEnumerable<Type> GetTypesAssignedFrom<TAssignedFrom>(this Assembly assembly)
        {
            return assembly.GetLoadableTypes().Where(type => typeof(TAssignedFrom).IsAssignableFrom(type) && type != typeof(TAssignedFrom));
        }

        private static bool IsAltinnLibrary(RuntimeLibrary library)
        {
            return library.Name.StartsWith(AltinnAssemblyIdentifier, StringComparison.OrdinalIgnoreCase)
                || library.Dependencies.Any(d => d.Name.StartsWith(AltinnAssemblyIdentifier, StringComparison.OrdinalIgnoreCase));
        }

        private static IEnumerable<Type> GetLoadableTypes(this Assembly assembly)
        {
            if (assembly == null) throw new ArgumentNullException(nameof(assembly));

            try
            {
                return assembly.GetTypes();
            }
            catch (ReflectionTypeLoadException e)
            {
                return e.Types.Where(t => t != null);
            }
        }
    }
}
