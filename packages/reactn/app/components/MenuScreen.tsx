import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { decodeServerCode, findBestServer } from '../utils/serverConnection';

interface MenuScreenProps {
  onConnect: (url: string) => void;
}

const { width, height } = Dimensions.get('window');

export default function MenuScreen({ onConnect }: MenuScreenProps) {
  const [serverCode, setServerCode] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = useCallback(async () => {
    if (!serverCode.trim()) {
      setError('请输入服务器地址编码');
      return;
    }

    setError('');
    setIsConnecting(true);

    try {
      const config = decodeServerCode(serverCode.trim());
      
      if (!config) {
        setError('服务器地址编码错误');
        setIsConnecting(false);
        return;
      }

      const result = await findBestServer(config);
      
      if (!result) {
        setError('服务器地址编码错误');
        setIsConnecting(false);
        return;
      }

      onConnect(result.url);
    } catch {
      setError('服务器地址编码错误');
      setIsConnecting(false);
    }
  }, [serverCode, onConnect]);

  return (
    <ImageBackground
      source={require('../../assets/images/main_background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      
      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>象</Text>
          <Text style={styles.titleText}>棋</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Input Section */}
        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            placeholder="请输入服务器地址编码"
            placeholderTextColor="rgba(160, 170, 180, 0.5)"
            value={serverCode}
            onChangeText={(text) => {
              setServerCode(text);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnecting}
          />

          <TouchableOpacity
            style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={isConnecting}
            activeOpacity={0.7}
          >
            {isConnecting ? (
              <ActivityIndicator color="rgba(0, 255, 170, 0.9)" />
            ) : (
              <Text style={styles.connectButtonText}>连接</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  titleText: {
    fontSize: 52,
    fontWeight: '700',
    color: 'rgba(0, 255, 170, 0.9)',
    letterSpacing: 24,
    textShadowColor: 'rgba(0, 255, 170, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  divider: {
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(0, 255, 170, 0.4)',
    marginBottom: 32,
  },
  inputSection: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  input: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 170, 0.3)',
    borderRadius: 4,
    color: 'rgba(0, 255, 170, 0.9)',
    fontSize: 16,
    letterSpacing: 2,
  },
  connectButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 170, 0.5)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonDisabled: {
    opacity: 0.5,
  },
  connectButtonText: {
    color: 'rgba(0, 255, 170, 0.9)',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 6,
  },
  errorContainer: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.3)',
    borderRadius: 4,
  },
  errorText: {
    color: 'rgba(255, 100, 100, 0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
});
