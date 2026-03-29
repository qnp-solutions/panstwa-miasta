import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  color?: string;
  className?: string;
}

export function Badge({ label, color = '#4ecdc4', className }: BadgeProps) {
  return (
    <View
      className={`rounded-full px-3 py-1 ${className ?? ''}`}
      style={{ backgroundColor: `${color}20` }}
    >
      <Text className="text-xs font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
