import { View } from 'react-native';
import type { ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  className?: string;
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <View
      className={`bg-surface rounded-2xl p-4 border border-border ${className ?? ''}`}
      {...rest}
    >
      {children}
    </View>
  );
}
