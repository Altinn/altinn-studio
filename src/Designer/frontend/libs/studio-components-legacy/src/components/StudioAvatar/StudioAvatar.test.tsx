import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioAvatar, type StudioAvatarProps } from './StudioAvatar';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

describe('StudioAvatar', () => {
  it('should render the default PersonCircleIcon when imageDetails is not provided', () => {
    renderStudioAvatar();

    const iconElement = screen.getByRole('img', { hidden: true });
    expect(iconElement).toBeInTheDocument();
  });

  it('should render an image with the correct src, alt, and title when avatarElement is provided', () => {
    const avatarElement = {
      src: 'avatar_src',
      alt: 'User Avatar',
      title: 'Avatar Image',
    };
    renderStudioAvatar({ componentProps: { ...avatarElement } });

    const imgElement = screen.getByRole('img', { name: avatarElement.alt });
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', avatarElement.src);
    expect(imgElement).toHaveAttribute('alt', avatarElement.alt);
    expect(imgElement).toHaveAttribute('title', avatarElement.title);
  });

  it('Appends given classname to internal classname when no image is given', () => {
    testRootClassNameAppending((className) =>
      renderStudioAvatar({ componentProps: { className } }),
    );
  });

  it('Appends given classname to internal classname when an image is given', () => {
    testRootClassNameAppending((className) =>
      renderStudioAvatar({ componentProps: { className, src: 'test.png', alt: 'Test' } }),
    );
  });
});

type Props = {
  componentProps?: Partial<StudioAvatarProps>;
};

const renderStudioAvatar = (props: Partial<Props> = {}) => {
  const { componentProps } = props;
  return render(<StudioAvatar {...componentProps} />);
};
