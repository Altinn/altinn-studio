using System;
using System.Reflection;
using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Filters.UserRequestContext
{
    public static class PropertySetterUtils
    {
        private const BindingFlags DeclaredOnlyLookup = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly;

        public static void SetValue(object instance, string name, object value)
        {
            Guard.AssertArgumentNotNull(instance, nameof(instance));
            Guard.AssertArgumentNotNull(name, nameof(name));

            var property = instance.GetType().GetProperty(name);

            if (property is null)
            {
                throw new ArgumentException($"Property with name {name} not found on type {instance.GetType().FullName}");
            }

            var setter = property.GetSetMethod(true);
            if (setter != null)
            {
                property.SetValue(instance, value);
                return;
            }

            var backingField = property.DeclaringType?.GetField($"<{property.Name}>k__BackingField", DeclaredOnlyLookup);
            if (backingField is null)
            {
                throw new InvalidOperationException($"Could not find a way to set {property.DeclaringType?.FullName}.{property.Name}. Try adding a private setter.");
            }
            backingField.SetValue(instance, value);
        }
    }
}
