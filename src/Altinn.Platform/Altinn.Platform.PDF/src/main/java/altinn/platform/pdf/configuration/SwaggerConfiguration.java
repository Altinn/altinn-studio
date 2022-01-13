package altinn.platform.pdf.configuration;

import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfiguration {
  @Bean
  public OpenAPI api() {
    String host;
    if (System.getenv("SWAGGER_BASE_URL") != null) {
      host = System.getenv("SWAGGER_BASE_URL");
    } else {
      host = "localhost:5070";
    }
    return new OpenAPI()
      .info(new Info().title("Altinn PDF")
        .description("API for creating a receipt pdf for an archived altinn app.")
        .version("v1.0.0")
        .license(new License().name("Apache 2.0").url("http://springdoc.org")))
      .externalDocs(new ExternalDocumentation()
        .description("SpringShop Wiki Documentation")
        .url(host));
  }
}
