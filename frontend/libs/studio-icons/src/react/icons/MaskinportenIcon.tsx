import React, { type ReactElement } from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const MaskinportenIcon = ({ ...props }: IconProps): ReactElement => {
  return (
    <SvgTemplate {...props}>
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M2.25 4.5C2.25 3.80964 2.80964 3.25 3.5 3.25H20.5C21.1904 3.25 21.75 3.80964 21.75 4.5V15.5C21.75 16.1904 21.1904 16.75 20.5 16.75H12.75V19.25H19C19.4142 19.25 19.75 19.5858 19.75 20C19.75 20.4142 19.4142 20.75 19 20.75H6C5.58579 20.75 5.25 20.4142 5.25 20C5.25 19.5858 5.58579 19.25 6 19.25H11.25V16.75H3.5C2.80964 16.75 2.25 16.1904 2.25 15.5V4.5ZM3.75 4.75V15.25H20.25V4.75H3.75Z'
        fill='#23262A'
      />
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M9.51605 7.6343C10.425 7.63204 11.2386 8.12643 11.6468 8.92088L16.0794 8.90985C16.1849 8.90959 16.2856 8.95373 16.3568 9.03147L16.7907 9.50482C16.8583 9.57858 16.8936 9.6763 16.8888 9.77623C16.884 9.87617 16.8394 9.97004 16.7651 10.037L15.1091 11.527C14.9585 11.6626 14.7274 11.6539 14.5873 11.5075L14.2624 11.1679L13.2782 11.7722C13.1323 11.8618 12.9441 11.8411 12.8211 11.722L11.9585 10.8864L11.7382 10.8869C11.2867 11.831 10.4993 12.4056 9.52793 12.408C8.21171 12.4113 7.14318 11.3512 7.13988 10.0287C7.13659 8.70375 8.19591 7.63759 9.51605 7.6343ZM11.0542 9.43057C10.8094 8.79111 10.2089 8.38258 9.51792 8.3843C8.61353 8.38655 7.88761 9.11456 7.88988 10.0268C7.89214 10.9351 8.62406 11.6602 9.52607 11.658C10.2027 11.6563 10.8018 11.2401 11.1438 10.3747C11.2002 10.2319 11.338 10.1379 11.4916 10.1375L12.109 10.136C12.2067 10.1357 12.3006 10.1736 12.3708 10.2416L13.1339 10.9807L14.1279 10.3704C14.2784 10.278 14.473 10.3032 14.5951 10.4308L14.8778 10.7262L15.9821 9.73259L15.9158 9.66026L11.4054 9.67148C11.2497 9.67187 11.1099 9.57599 11.0542 9.43057ZM9.48844 9.27122C9.90083 9.27019 10.2404 9.59999 10.2414 10.0182C10.2425 10.4335 9.9075 10.7702 9.49218 10.7712C9.07395 10.7723 8.74246 10.4343 8.74144 10.022C8.74039 9.60294 9.07461 9.27225 9.48844 9.27122Z'
        fill='#23262A'
      />
    </SvgTemplate>
  );
};