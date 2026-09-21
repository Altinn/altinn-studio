using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces.Validation;

public interface ITaskDefaultDataTypeBindingValidator
{
    Task<IReadOnlyDictionary<string, string[]>> ValidateAsync(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    );
}
