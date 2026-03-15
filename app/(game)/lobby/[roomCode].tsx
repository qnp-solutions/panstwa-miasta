import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function LobbyScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 24 }}>Lobby: {roomCode}</Text>
    </View>
  );
}
