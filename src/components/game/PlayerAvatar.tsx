import { View, Text } from 'react-native';

interface PlayerAvatarProps {
  nickname: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
} as const;

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
} as const;

export function PlayerAvatar({
  nickname,
  color,
  size = 'md',
  isOnline = true,
  className,
}: PlayerAvatarProps) {
  const initial = nickname.charAt(0).toUpperCase();

  return (
    <View className={`relative ${className ?? ''}`}>
      <View
        className={`${sizeClasses[size]} rounded-full items-center justify-center`}
        style={{ backgroundColor: color }}
      >
        <Text className={`${textSizeClasses[size]} font-bold text-white`}>
          {initial}
        </Text>
      </View>
      {!isOnline && (
        <View className="absolute inset-0 rounded-full bg-black/50" />
      )}
    </View>
  );
}
