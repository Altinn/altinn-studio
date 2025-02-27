using System.Text.Json.Nodes;

namespace Altinn.Studio.Designer.Models
{
    public class AltinnPageLayout
    {
        private const string LayoutSchemaUrl =
            "https://altinncdn.no/schemas/json/layout/layout.schema.v1.json";

        public JsonObject Structure { get; set; }

        public AltinnPageLayout()
        {
            Structure = new()
            {
                ["$schema"] = LayoutSchemaUrl,
                ["data"] = new JsonObject { ["layout"] = new JsonArray([]) },
            };
        }

        public AltinnPageLayout WithNavigationButtons()
        {
            (Structure["data"]["layout"] as JsonArray).Add(
                new JsonObject()
                {
                    ["id"] = "NavigationButtons-suCZbM",
                    ["showBackButton"] = true,
                    ["textResourceBindings"] = { },
                    ["type"] = "NavigationButtons",
                }
            );
            return this;
        }
    }
}
