namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Provides a factory for creating instances of <see cref="IFormDataWrapper"/> specific to a data model type.
/// This ensures custom wrappers can be used for form data serialization or deserialization when required.
/// </summary>
public static class FormDataWrapperFactory
{
    private static readonly Dictionary<Type, Func<object, IFormDataWrapper>> _dataWrappers = [];

    /// <summary>
    /// Registers a factory for creating instances of <see cref="IFormDataWrapper"/> for a specific type.
    /// </summary>
    /// <typeparam name="T">The type for which the factory is being registered. It must not be null.</typeparam>
    /// <param name="factory">A function that takes an object of type T and returns an instance of <see cref="IFormDataWrapper"/>.</param>
    public static void Register<T>(Func<object, IFormDataWrapper> factory)
        where T : notnull
    {
        _dataWrappers[typeof(T)] = factory;
    }

    internal static IFormDataWrapper Create(object dataModel)
    {
        if (_dataWrappers.TryGetValue(dataModel.GetType(), out var accessorType))
        {
            return accessorType(dataModel);
        }

        // TODO: Do some sort of startup validation to ensure that all data model types have a registered wrapper?
        return new ReflectionFormDataWrapper(dataModel);
    }
}
