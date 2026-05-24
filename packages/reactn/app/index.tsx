import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import MenuScreen from './components/MenuScreen';
import GameWebView from './components/GameWebView';

export default function Index() {
  const [gameUrl, setGameUrl] = useState<string | null>(null);

  const handleConnect = useCallback((url: string) => {
    setGameUrl(url);
  }, []);

  const handleWebViewError = useCallback(() => {
    setGameUrl(null);
  }, []);

  return (
    <View style={styles.container}>
      {gameUrl ? (
        <GameWebView url={gameUrl} onError={handleWebViewError} />
      ) : (
        <MenuScreen onConnect={handleConnect} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
