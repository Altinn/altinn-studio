import React from 'react';
import classes from './Icon.module.css';
import cn from 'classnames';

export enum IconImage {
  Array = 'array',
  Boolean = 'boolean',
  Combination = 'combination',
  Definition = 'definition',
  Element = 'element',
  Number = 'number',
  Object = 'object',
  Property = 'property',
  Reference = 'reference',
  String = 'string',
  Wastebucket = 'wastebucket'
}

export interface IconProps {
  className?: string,
  image: IconImage
}

export const Icon = ({className, image}: IconProps) => {
  return <span className={cn(classes[image], className)}/>;
}
