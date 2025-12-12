// import React from 'react';
// import type { PropsWithChildren } from 'react';
//
// import { Flex } from 'src/app-components/Flex/Flex';
// import { Label } from 'src/app-components/Label/Label';
// import type { IGrid } from 'src/layout/common.generated';
// import type { CompTypes } from 'src/layout/layout';
//
// type ComponentStructureWrapperProps<Type extends CompTypes> = {
//   label?: string;
//   className?: string;
//   style?: React.CSSProperties;
//   grid?: IGrid;
//   id: string;
// };
//
// export function ComponentStructureWrapperNext<Type extends CompTypes = CompTypes>({
//   children,
//   label,
//   className,
//   style,
//   grid,
//   id,
// }: PropsWithChildren<ComponentStructureWrapperProps<Type>>) {
//   const componentWithValidations = (
//     <Flex
//       id={`form-content-${id}`}
//       className={className}
//       size={{ xs: 12, ...grid?.innerGrid }}
//       style={style}
//       item
//     >
//       {children}
//     </Flex>
//   );
//
//   return label ? <Label label={label}>{componentWithValidations}</Label> : componentWithValidations;
// }
