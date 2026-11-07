using System;

namespace Altinn.Studio.Designer.Exceptions.DataModeling;

/// <summary>
/// A new data model has the name of a data type that is not this data model, such as an attachment. Designer does not
/// let a person add such a data model.
/// </summary>
/// <param name="dataTypeId">The id of the data type that has the name.</param>
internal sealed class DataTypeWithTheSameNameExists(string dataTypeId)
    : Exception(
        $"The app already has a data type with the name '{dataTypeId}', and it is not this data model. "
            + "Give the new data model a name that no data type has."
    );
