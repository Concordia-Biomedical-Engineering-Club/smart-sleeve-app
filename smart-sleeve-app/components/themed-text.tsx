import { StyleSheet, Text, type TextProps } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Typography } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'subtitle' | 'link' | 'caption' | 'label' | 'bodyBold';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'caption' ? styles.caption : undefined,
        type === 'label' ? styles.label : undefined,
        type === 'bodyBold' ? styles.bodyBold : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    ...Typography.body,
  },
  bodyBold: {
    ...Typography.bodyBold,
  },
  title: {
    ...Typography.heading1,
  },
  subtitle: {
    ...Typography.heading3,
  },
  caption: {
    ...Typography.caption,
  },
  label: {
    ...Typography.label,
  },
  link: {
    ...Typography.body,
    color: '#00B8A9', // Using palette medical teal for links
  },
});
