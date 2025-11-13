import React from 'react';
import { render } from '@testing-library/react-native';
import ModalScreen from '../app/modal'; // adjust path if needed

// Mock expo-router Link component
jest.mock('expo-router', () => {
  return {
    Link: ({ children, ...props }: any) => {
      return (
        <div testID="mock-link" {...props}>
          {children}
        </div>
      );
    },
  };
});

describe('ModalScreen', () => {
  it('renders the modal title and link', () => {
    const { getByText, getByTestId } = render(<ModalScreen />);

    // Check title text
    expect(getByText('This is a modal')).toBeTruthy();

    // Check link text
    expect(getByText('Go to home screen')).toBeTruthy();

    // Check the link mock exists
    const link = getByTestId('mock-link');
    expect(link.props.href).toBe('/');
  });
});
