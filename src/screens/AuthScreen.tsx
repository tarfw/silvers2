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
import { useNavigation } from '@react-navigation/native';

export function AuthScreen() {
  const navigation = useNavigation();
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
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute z-10 p-2 ml-4"
          style={{ top: insets.top + 10 }}
        >
          <Ionicons name="chevron-back" size={28} color="black" />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 32,
            paddingTop: insets.top + 80,
            paddingBottom: 40
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View className="mb-10">
            <Text className="text-4xl font-bold text-black tracking-tighter leading-tight">
              {isSignUp ? 'Join\nSKJ Silvers' : 'Hello Again'}
            </Text>
            <Text className="text-brand-secondary text-lg font-medium mt-4 leading-7">
              {isSignUp
                ? 'Create an account to start your collection of exquisite silver jewelry.'
                : 'Sign in to access your account and manage your orders.'}
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
              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
                containerClassName="mb-1"
              />

              <View>
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  icon="lock-closed-outline"
                  containerClassName="mb-1"
                />
                {!isSignUp && (
                  <TouchableOpacity className="self-end mt-2">
                    <Text className="text-sm font-semibold text-brand-jewel">Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!isFormValid || isLoading}
                activeOpacity={0.9}
                className={`w-full h-16 rounded-lg flex-row items-center justify-center mt-10 ${isFormValid ? 'bg-black shadow-lg' : 'bg-silver-100'
                  }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text className={`text-[15px] font-medium uppercase tracking-[2px] ${isFormValid ? 'text-white' : 'text-silver-400'
                      }`}>
                      {isSignUp ? 'Create My Account' : 'Sign In To Store'}
                    </Text>
                    {isFormValid && <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 12 }} />}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Mode Switch */}
          <View className="mt-12 items-center">
            <TouchableOpacity
              onPress={toggleMode}
              activeOpacity={0.7}
              className="flex-row items-center"
            >
              <Text className="text-brand-secondary text-[15px] font-medium">
                {isSignUp ? 'Already have an account?' : "New to SKJ Silvers?"}
              </Text>
              <Text className="text-brand-jewel font-bold text-[15px] ml-2">
                {isSignUp ? 'Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
