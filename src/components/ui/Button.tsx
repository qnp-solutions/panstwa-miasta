import { Pressable, Text, ActivityIndicator } from 'react-native';
import type { PressableProps } from 'react-native';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantClasses = {
  primary: 'bg-primary',
  outline: 'bg-surface border border-primary',
  ghost: 'bg-transparent',
} as const;

const variantTextClasses = {
  primary: 'text-background font-bold',
  outline: 'text-primary font-semibold',
  ghost: 'text-primary font-semibold',
} as const;

const sizeClasses = {
  sm: 'h-10 px-4 rounded-lg',
  md: 'h-[52px] px-6 rounded-xl',
  lg: 'h-14 px-8 rounded-xl',
} as const;

const sizeTextClasses = {
  sm: 'text-sm',
  md: 'text-[17px]',
  lg: 'text-lg',
} as const;

const spinnerColors = {
  primary: '#1a1a2e',
  outline: '#4ecdc4',
  ghost: '#4ecdc4',
} as const;

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  ...rest
}: ButtonProps & { className?: string }) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      className={`w-full max-w-[340px] items-center justify-center ${variantClasses[variant]} ${sizeClasses[size]} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColors[variant]} />
      ) : (
        <Text className={`${variantTextClasses[variant]} ${sizeTextClasses[size]}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
