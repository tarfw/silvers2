import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Ionicons } from '@expo/vector-icons';

export function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-12">
          <Text className="text-4xl font-bold text-black tracking-tighter mb-2">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </Text>
          <Text className="text-lg text-brand-secondary font-medium">
            {isSignUp ? 'Join the premium experience' : 'Sign in to your Silvers account'}
          </Text>
        </View>

        <View className="w-full max-w-sm self-center">
          {error && (
            <View className="bg-red-50 p-4 rounded-2xl mb-6 border border-red-100">
              <Text className="text-red-600 text-sm font-medium">{error}</Text>
            </View>
          )}

          <Input
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
          />

          <Input
            label="Password"
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            icon="lock-closed-outline"
          />

          <Button
            label={isSignUp ? 'Create account' : 'Sign In'}
            onPress={handleSubmit}
            isLoading={isLoading}
            disabled={!isFormValid}
            size="lg"
            className="mt-4"
          />
        </View>

        <View className="flex-row items-center mt-8 mb-6">
          <View className="flex-1 h-[1px] bg-silver-100" />
          <Text className="mx-4 text-silver-400 text-xs font-bold uppercase tracking-widest">or</Text>
          <View className="flex-1 h-[1px] bg-silver-100" />
        </View>

        <View className="w-full max-w-sm self-center">
          <Button
            label="Continue with Google"
            onPress={() => { }} // TODO: Implement Google Sign In
            variant="outline"
            size="lg"
            icon={<Ionicons name="logo-google" size={20} color="#000" />}
          />
        </View>

        <View className="flex-1" />

        <TouchableOpacity
          onPress={toggleMode}
          activeOpacity={0.7}
          className="items-center py-6"
        >
          <Text className="text-brand-secondary text-base">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <Text className="text-black font-bold">
              {isSignUp ? ' Sign In' : ' Create account'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
