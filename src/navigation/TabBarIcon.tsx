import { Text, StyleSheet } from 'react-native';
import React from 'react';

interface TabBarIconProps {
  name: string;
  focused: boolean;
  color: string;
  size: number;
}

export const TabBarIcon = ({ name, focused, color, size }: TabBarIconProps) => (
  <Text style={[
    styles.icon,
    { color, fontSize: size },
    focused && styles.iconFocused
  ]}>
    {name}
  </Text>
);

const styles = StyleSheet.create({
  icon: {
    fontSize: 24,
  },
  iconFocused: {
    fontWeight: 'bold',
  },
});