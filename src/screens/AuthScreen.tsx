import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Ionicons } from '@expo/vector-icons';

export function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const handleSubmit = useCallback(async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, isSignUp, signIn, signUp]);

  const toggleMode = useCallback(() => {
    setIsSignUp((prev) => !prev);
    setError(null);
    setEmail('');
    setPassword('');
  }, []);

  const isFormValid = email.length > 0 && password.length >= 6;

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 32,
            paddingTop: insets.top + 60,
            paddingBottom: 40
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View className="mb-12">
            <Text className="text-5xl font-bold text-black tracking-tighter leading-tight">
              {isSignUp ? 'Create\nAccount' : 'Welcome\nBack'}
            </Text>
            <View className="w-12 h-1 bg-black mt-6 rounded-full" />
            <Text className="text-brand-secondary text-[16px] font-medium mt-6 leading-6">
              {isSignUp
                ? 'Discover our exclusive collection of fine silver jewelry.'
                : 'Sign in to manage your orders and treasures.'}
            </Text>
          </View>

          {/* Form Section */}
          <View className="flex-1">
            {error && (
              <View className="bg-red-50 p-4 rounded-2xl border border-red-100 flex-row items-center mb-8">
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text className="text-red-600 text-[13px] font-semibold ml-3 flex-1">{error}</Text>
              </View>
            )}

            <View className="gap-y-6">
              <View>
                <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2.5px] mb-3 ml-1">Email Connection</Text>
                <Input
                  placeholder="name@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-silver-50/50 border-silver-100 h-14 rounded-2xl"
                  containerClassName="mb-0"
                />
              </View>

              <View>
                <Text className="text-[10px] font-bold text-brand-secondary uppercase tracking-[2.5px] mb-3 ml-1">Secure Passkey</Text>
                <Input
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  className="bg-silver-50/50 border-silver-100 h-14 rounded-2xl"
                  containerClassName="mb-0"
                />
                {!isSignUp && (
                  <TouchableOpacity className="self-end mt-4">
                    <Text className="text-[11px] font-bold text-black uppercase tracking-wider">Forgot Security Key?</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!isFormValid || isLoading}
                activeOpacity={0.9}
                style={{
                  backgroundColor: isFormValid ? '#000' : '#F2F2F7',
                }}
                className={`w-full h-16 rounded-2xl flex-row items-center justify-center mt-6 border ${isFormValid ? 'border-black' : 'border-transparent'}`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text className={`text-[15px] font-bold uppercase tracking-[2px] ${isFormValid ? 'text-white' : 'text-silver-400'}`}>
                      {isSignUp ? 'Initialize Account' : 'Secure Entry'}
                    </Text>
                    {isFormValid && <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 10 }} />}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Navigation */}
          <View className="mt-12 items-center">
            <TouchableOpacity
              onPress={toggleMode}
              activeOpacity={0.7}
              className="flex-row items-center bg-silver-50 px-6 py-3 rounded-full border border-silver-100"
            >
              <Text className="text-brand-secondary text-[13px] font-medium">
                {isSignUp ? 'Already have an account?' : "Don't have a passkey?"}
              </Text>
              <Text className="text-black font-bold text-[13px] ml-2">
                {isSignUp ? 'Sign In' : 'Register'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
