import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioAvatar, type StudioAvatarProps } from './StudioAvatar';

describe('StudioAvatar', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render the default PersonCircleIcon when imageDetails is not provided', () => {
    renderStudioAvatar();

    const iconElement = screen.getByRole('img', { hidden: true });
    expect(iconElement).toBeInTheDocument();
    expect(iconElement).toHaveClass('avatar');
  });

  it('should render an image with the correct src, alt, and title when imageDetails is provided', () => {
    const imageDetails = {
      src: 'avatar_src',
      alt: 'User Avatar',
      title: 'Avatar Image',
    };
    renderStudioAvatar({ componentProps: { imageDetails } });

    const imgElement = screen.getByRole('img', { name: imageDetails.alt });
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', imageDetails.src);
    expect(imgElement).toHaveAttribute('alt', imageDetails.alt);
    expect(imgElement).toHaveAttribute('title', imageDetails.title);
    expect(imgElement).toHaveClass('avatar');
  });
});

type Props = {
  componentProps?: Partial<StudioAvatarProps>;
};

const renderStudioAvatar = (props: Partial<Props> = {}) => {
  const { componentProps } = props;
  return render(<StudioAvatar {...componentProps} />);
};
