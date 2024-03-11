using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AltinnSchemaValidator : IAltinnSchemaValidator
{
    public async Task<bool> ValidateAltinnXsdSchema(Stream xsdSchema)
    {
        await Task.CompletedTask;
        // load Xml schema and convert it to json schema, modelmetadata and c# classes


        return false;
    }
}
