using System;

namespace Altinn.Studio.Designer.Exceptions.DataModeling;

public class ModelWithTheSameBaseTypeAlreadyExists : Exception
{
    public ModelWithTheSameBaseTypeAlreadyExists() { }

    public ModelWithTheSameBaseTypeAlreadyExists(string message)
        : base(message) { }
}
