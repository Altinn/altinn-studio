package altinn.platform.pdf.models;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "Edit properties for a group layout element")
@Getter
@Setter
public class GroupEditProperties {
  private boolean multiPage;
}
