import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';

// Professional vibrant sapphire blue from the jewelry imagery
const JEWEL_BLUE_BG = '#004c8c';

export function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigation = useNavigation();

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
    <SafeAreaView className="flex-1" style={{ backgroundColor: JEWEL_BLUE_BG }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Editorial Header */}
          <View className="mb-12">
            <Text className="text-4xl text-white font-serif tracking-tight leading-[48px]">
              {isSignUp ? 'Create your\nCollection.' : 'Welcome\nBack.'}
            </Text>
            <Text className="text-white/80 text-lg mt-4 font-light">
              {isSignUp
                ? 'Join SKJ and discover fine silver.'
                : 'Sign in to access your saved treasures.'}
            </Text>
          </View>

          {/* User-Friendly Form Area */}
          <View className="w-full bg-white/5 p-6 rounded-[32px] border border-white/10">
            {error && (
              <View className="bg-rose-500/20 p-4 rounded-2xl border border-rose-500/20 flex-row items-center mb-6">
                <Ionicons name="alert-circle" size={20} color="#fb7185" style={{ marginRight: 10 }} />
                <Text className="text-rose-100 text-sm font-medium flex-1">{error}</Text>
              </View>
            )}

            <View className="space-y-6">
              <View>
                <Text className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-3 ml-1">Email Address</Text>
                <Input
                  placeholder="name@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                  // User-friendly update: Solid white inputs with dark text for maximum legibility
                  className="bg-white rounded-2xl h-14 text-slate-900 px-5 border-none shadow-sm"
                  containerClassName="mb-0"
                />
              </View>

              <View>
                <Text className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-3 ml-1">Password</Text>
                <Input
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                  className="bg-white rounded-2xl h-14 text-slate-900 px-5 border-none shadow-sm"
                  containerClassName="mb-0"
                />
                {!isSignUp && (
                  <TouchableOpacity className="self-end mt-4">
                    <Text className="text-xs font-semibold text-white/60 underline">Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!isFormValid || isLoading}
                activeOpacity={0.8}
                className={`w-full h-16 rounded-2xl flex-row items-center justify-center mt-4 ${isFormValid ? 'bg-white' : 'bg-white/10'}`}
              >
                {isLoading ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <Text className={`text-lg font-bold ${isFormValid ? 'text-black' : 'text-white/30'}`}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Mode Toggle Footer */}
          <View className="mt-auto items-center flex-row justify-center py-10">
            <Text className="text-white/60 text-sm">
              {isSignUp ? 'Already member?' : "New to SKJ Silvers?"}
            </Text>
            <TouchableOpacity
              onPress={toggleMode}
              activeOpacity={0.7}
              className="ml-2"
            >
              <Text className="text-white font-extrabold text-sm underline decoration-white/40">
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
