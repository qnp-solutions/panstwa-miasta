import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ResultsScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 24 }}>Results — {roomCode}</Text>
    </View>
  );
}
