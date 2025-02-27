using System;
using System.Linq;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Designer.Models
{
    public class AltinnPageLayout
    {
        private const string LayoutSchemaUrl =
            "https://altinncdn.no/schemas/json/layout/layout.schema.v1.json";
        private readonly Random _random = new();

        public JsonObject Structure { get; set; }

        public AltinnPageLayout()
        {
            Structure = new()
            {
                ["$schema"] = LayoutSchemaUrl,
                ["data"] = new JsonObject { ["layout"] = new JsonArray([]) },
            };
        }

        private string generateRandomId(int length = 6)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
            return new string(
                [.. Enumerable.Repeat(chars, length).Select(s => s[_random.Next(s.Length)])]
            );
        }

        public AltinnPageLayout WithNavigationButtons()
        {
            (Structure["data"]["layout"] as JsonArray).Add(
                new JsonObject()
                {
                    ["id"] = "NavigationButtons-" + generateRandomId(),
                    ["showBackButton"] = true,
                    ["textResourceBindings"] = { },
                    ["type"] = "NavigationButtons",
                }
            );
            return this;
        }
    }
}
