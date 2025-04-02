using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Microsoft.Extensions.DependencyModel;

namespace Altinn.Studio.Designer.Helpers
{
    public static class AltinnAssembliesScanner
    {
        private const string AltinnAssemblyIdentifier = "Altinn.";

        public static DependencyContext DependencyContext { get; set; } = DependencyContext.Default;

        public static IEnumerable<Type> GetTypesAssignedFrom<TAssignedFrom>()
        {
            if (DependencyContext == null)
            {
                throw new InvalidOperationException("PreserveCompilationContext should be set to true for default DependencyContext.");
            }

            return DependencyContext
                .RuntimeLibraries
                .Where(IsAltinnLibrary)
                .Where(IsLoadable)
                .Select(library => Assembly.Load(new AssemblyName(library.Name)))
                .GetTypesAssignedFrom<TAssignedFrom>();
        }

        private static bool IsLoadable(RuntimeLibrary library)
        {
            // Contains assembly
            if (!library.RuntimeAssemblyGroups.Any())
            {
                return false;
            }

            try
            {
                Assembly.Load(new AssemblyName(library.Name));
                return true;
            }
            catch (Exception ex) when (ex is FileNotFoundException or FileLoadException)
            {
                return false;
            }
        }

        private static IEnumerable<Type> GetTypesAssignedFrom<TAssignedFrom>(this IEnumerable<Assembly> assemblies)
        {
            return assemblies.SelectMany(a => a.GetTypesAssignedFrom<TAssignedFrom>());
        }

        private static IEnumerable<Type> GetTypesAssignedFrom<TAssignedFrom>(this Assembly assembly)
        {
            return assembly.GetLoadableTypes().Where(type => typeof(TAssignedFrom).IsAssignableFrom(type) && type != typeof(TAssignedFrom));
        }

        private static IEnumerable<Type> GetLoadableTypes(this Assembly assembly)
        {
            try
            {
                return assembly.GetTypes();
            }
            catch (ReflectionTypeLoadException e)
            {
                return e.Types.Where(t => t != null);
            }
        }

        private static bool IsAltinnLibrary(RuntimeLibrary library)
        {
            return library.Name.StartsWith(AltinnAssemblyIdentifier, StringComparison.OrdinalIgnoreCase)
                || library.Dependencies.Any(d => d.Name.StartsWith(AltinnAssemblyIdentifier, StringComparison.OrdinalIgnoreCase));
        }
    }
}
