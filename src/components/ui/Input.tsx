import { TextInput } from 'react-native';
import type { TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  className?: string;
}

export function Input({ className, ...rest }: InputProps) {
  return (
    <TextInput
      className={`w-full max-w-[340px] h-[52px] rounded-xl bg-surface text-white text-lg px-4 border border-border ${className ?? ''}`}
      placeholderTextColor="#666"
      {...rest}
    />
  );
}
