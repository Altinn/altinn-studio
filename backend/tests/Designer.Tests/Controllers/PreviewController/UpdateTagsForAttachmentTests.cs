using Microsoft.AspNetCore.Mvc.Testing;

namespace Designer.Tests.Controllers.PreviewController
{
    public class UpdateTagsForAttachmentTests : PreviewControllerTestsBase<UpdateFormDataTests>
    {

        public UpdateTagsForAttachmentTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }
    }
}
