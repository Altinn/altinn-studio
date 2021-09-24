using System.Collections.Generic;

using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Mappers
{
    /// <summary>
    /// Mapper for simple instances.
    /// </summary>
    public static class SimpleInstanceMapper
    {
        /// <summary>
        /// Maps an instance to a simple instance object
        /// </summary>
        /// <param name="instance">The instance to map</param>
        /// <param name="lastChangedByName">The full name of the entity to last change the instance</param>
        public static SimpleInstance MapInstanceToSimpleInstance(Instance instance, string lastChangedByName)
        {
            return new SimpleInstance
            {
                InstanceId = instance.Id,
                LastChanged = instance.LastChanged,
                LastChangedBy = lastChangedByName
            };
        }

        /// <summary>
        /// Maps a list of instances to a list of simple instances
        /// </summary>
        /// <param name="instances">The list of instances to map</param>
        /// <param name="userDictionary">A dictionary for looking up full name of the entity to last change the instance based on instance.LastChangedBy.</param>
        /// <returns>A list of simple instances.</returns>
        public static List<SimpleInstance> MapInstanceListToSimpleInstanceList(List<Instance> instances, Dictionary<string, string> userDictionary)
        {
            List<SimpleInstance> simpleInstances = new List<SimpleInstance>();
            foreach (Instance instance in instances)
            {
                string lastChangedByName = userDictionary.ContainsKey(instance.LastChangedBy) ? userDictionary[instance.LastChangedBy] : string.Empty;
                simpleInstances.Add(MapInstanceToSimpleInstance(instance, lastChangedByName));
            }

            return simpleInstances;
        }
    }
}
