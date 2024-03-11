using System.IO;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAltinnSchemaValidator
{
    Task<bool> ValidateAltinnXsdSchema(Stream xsdSchema);


}
