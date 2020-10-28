import React from 'react';
import SvgIcon, { SvgIconProps } from '@material-ui/core/SvgIcon';
import { TransitionProps } from '@material-ui/core/transitions';
import Collapse from '@material-ui/core/Collapse';
import { useSpring, animated } from 'react-spring/web.cjs'; // web.cjs is required for IE 11 support
import { SchemaItem } from './SchemaItem';
import { InputField } from './components/InputField';
import { TreeItem } from '@material-ui/lab';

const JsonPointer = require('jsonpointer');

// export function buildTreeView(subSchema: any, mainSchema: any, rootElement: string): JSX.Element {
//   if (subSchema.properties)
//   {
//     const propertyTreeItems: any[] = [];
//     Object.keys(subSchema.properties).forEach((key: string) => {
//       const localRootElement = subSchema.properties[key];
//       if (localRootElement.$ref) {
//         const childSchemaPtr = JsonPointer.compile(localRootElement.$ref.substr(1));
//         propertyTreeItems.push(
//           <SchemaItem schemaPath={`${rootElement}/${key}`} nodeId={key} label={key}>
//             {buildTreeView(childSchemaPtr.get(mainSchema), mainSchema, localRootElement.$ref)}
//           </SchemaItem>
//         );
//       } else if (localRootElement.items && localRootElement.items.$ref) {
//         const childSchemaPtr = JsonPointer.compile(localRootElement.items.$ref.substr(1));
//         propertyTreeItems.push(
//           <SchemaItem schemaPath={`${rootElement}/${key}`} nodeId={key} label={key}>
//             {buildTreeView(childSchemaPtr.get(mainSchema), mainSchema, localRootElement.items.$ref)}
//           </SchemaItem>
//         );
//       } else {
//         propertyTreeItems.push(
//           <div>
//             {Object.keys(localRootElement).map((element: string) => {
//               return (
//                 <SchemaItem schemaPath={`${rootElement}`} nodeId={rootElement} label={rootElement}>
//                   <InputField label={element} value={localRootElement[element]} />
//                 </SchemaItem>
//               );
//             })}
//           </div>
//         )
//       }
//     });
//     return (
//       <SchemaItem schemaPath={`${rootElement}`} nodeId={rootElement} label={rootElement}>
//         {propertyTreeItems}
//       </SchemaItem>
//     )
//   }

//   if (subSchema.$ref) {
//     const ptr = JsonPointer.compile(subSchema.$ref.substr(1));
//     return buildTreeView(ptr.get(mainSchema), mainSchema, subSchema.$ref);
//   }
  
//   return (
//     <div>
//       {Object.keys(subSchema).map((element: string) => {
//         return (
//             <InputField label={element} value={subSchema[element]} />
//         );
//       })}
//     </div>
//   )
// }

export function updateObject(obj: any, path: string, value: string) {
  if (path.startsWith('#')) {
    path = path.substr(1);
  }

  JsonPointer.set(obj, path, value);
}

export function buildSimpleTreeView(schema: any, currentPath: string, onChangeFunc: (value: string, key: string) => void): any[] {
  const schemaItems: any[] = [];
  console.log('currentPath: ', currentPath);
  Object.keys(schema).forEach((key) => {
    if (typeof schema[key] === 'object' && schema[key] !== null) {
      schemaItems.push(
        <SchemaItem
          schemaPath={`${currentPath}/${key}`}
          nodeId={`${currentPath}/${key}`}
          label={key}
        >
          {buildSimpleTreeView(schema[key], `${currentPath}/${key}`, onChangeFunc)}
        </SchemaItem>
      )
    } else {
      schemaItems.push(
        <div>
          <InputField
            value={schema[key]}
            label={key}
            fullPath={`${currentPath}/${key}`}
            onChange={onChangeFunc}/>
        </div>
      )
    }
  });

  return schemaItems;
}

export function MinusSquare(props: SvgIconProps) {
  return (
    <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 11.023h-11.826q-.375 0-.669.281t-.294.682v0q0 .401.294 .682t.669.281h11.826q.375 0 .669-.281t.294-.682v0q0-.401-.294-.682t-.669-.281z" />
    </SvgIcon>
  );
}

export function PlusSquare(props: SvgIconProps) {
  return (
    <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 12.977h-4.923v4.896q0 .401-.281.682t-.682.281v0q-.375 0-.669-.281t-.294-.682v-4.896h-4.923q-.401 0-.682-.294t-.281-.669v0q0-.401.281-.682t.682-.281h4.923v-4.896q0-.401.294-.682t.669-.281v0q.401 0 .682.281t.281.682v4.896h4.923q.401 0 .682.281t.281.682v0q0 .375-.281.669t-.682.294z" />
    </SvgIcon>
  );
}

export function CloseSquare(props: SvgIconProps) {
  return (
    <SvgIcon className="close" fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M17.485 17.512q-.281.281-.682.281t-.696-.268l-4.12-4.147-4.12 4.147q-.294.268-.696.268t-.682-.281-.281-.682.294-.669l4.12-4.147-4.12-4.147q-.294-.268-.294-.669t.281-.682.682-.281.696 .268l4.12 4.147 4.12-4.147q.294-.268.696-.268t.682.281 .281.669-.294.682l-4.12 4.147 4.12 4.147q.294.268 .294.669t-.281.682zM22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0z" />
    </SvgIcon>
  );
}

export function TransitionComponent(props: TransitionProps) {
  const style = useSpring({
    from: { opacity: 0, transform: 'translate3d(20px,0,0)' },
    to: { opacity: props.in ? 1 : 0, transform: `translate3d(${props.in ? 0 : 20}px,0,0)` },
  });

  return (
    <animated.div style={style}>
      <Collapse {...props} />
    </animated.div>
  );
}

export function getSchemaPart(dataModelPath: string[], subSchema: any, mainSchema: any): any {
  const dataModelRoot = dataModelPath[0];
  if (subSchema.properties && subSchema.properties[dataModelRoot] && dataModelPath && dataModelPath.length !== 0) {
    const localRootElement = subSchema.properties[dataModelRoot];
    if (localRootElement.$ref) {
      const childSchemaPtr = JsonPointer.compile(localRootElement.$ref.substr(1));
      return getSchemaPart(dataModelPath.slice(1), childSchemaPtr.get(mainSchema), mainSchema);
    }
    if (localRootElement.items && localRootElement.items.$ref) {
      const childSchemaPtr = JsonPointer.compile(localRootElement.items.$ref.substr(1));
      return getSchemaPart(dataModelPath.slice(1), childSchemaPtr.get(mainSchema), mainSchema);
    }
    return localRootElement;
  }

  if (subSchema.allOf) {
    let tmpSchema: any = {};
    subSchema.allOf.forEach((element: any) => {
      tmpSchema = {
        ...tmpSchema,
        ...element,
      };
    });
    return getSchemaPart(dataModelPath, tmpSchema, mainSchema);
  }

  if (subSchema.$ref) {
    const ptr = JsonPointer.compile(subSchema.$ref.substr(1));
    return getSchemaPart(dataModelPath.slice(1), ptr.get(mainSchema), mainSchema);
  }

  return subSchema;
}