using System;

namespace Altinn.Studio.Designer.Exceptions.DataModeling;

/// <summary>
/// A new data model has the name of another data type, such as an attachment.
/// </summary>
/// <param name="dataTypeId">The id of the data type that has the name.</param>
internal sealed class DataTypeWithTheSameNameExists(string dataTypeId)
    : Exception(
        $"The app already has a data type with the name '{dataTypeId}', and it is not this data model. "
            + "Give the new data model a name that no data type has."
    );
