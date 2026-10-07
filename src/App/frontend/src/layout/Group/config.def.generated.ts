import { ContainerComponent } from 'src/layout/LayoutComponent';

export abstract class GroupDef extends ContainerComponent<'Group'> {
  protected readonly type = 'Group';

  directRender(): boolean {
    return true;
  }
}

// Source hash: 33fc28eabdd62a5cb02f8d7764dce79aa3be31ddc1420366c9392303be793883
