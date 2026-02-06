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
  TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
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
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
          style={{
            position: 'absolute',
            zIndex: 10,
            top: insets.top + 10,
            left: 20,
            padding: 8
          }}
        >
          <Ionicons name="chevron-back" size={28} color="black" />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 32,
            paddingTop: insets.top + 80,
            paddingBottom: 60
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={{ marginBottom: 40 }}>
            <Text style={{ fontSize: 40, fontWeight: '800', color: '#000000', letterSpacing: -1.5, lineHeight: 44 }}>
              {isSignUp ? 'Join\nSKJ Silvers' : 'Hello Again'}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '500', color: '#636366', marginTop: 16, lineHeight: 26 }}>
              {isSignUp
                ? 'Create an account to start your collection of exquisite silver jewelry.'
                : 'Sign in to access your account and manage your orders.'}
            </Text>
          </View>

          {/* Form Section */}
          <View style={{ flex: 1 }}>
            {error && (
              <View style={{
                backgroundColor: '#fef2f2',
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#fee2e2',
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 32
              }}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '600', marginLeft: 12, flex: 1 }}>{error}</Text>
              </View>
            )}

            <View style={{ gap: 24 }}>
              {/* Email Input - Pure Style */}
              <View style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#636366', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 }}>Email Address</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderColor: '#E5E5EA', height: 60, paddingHorizontal: 4 }}>
                  <Ionicons name="mail-outline" size={20} color="#000000" style={{ marginRight: 12 }} />
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor="#AEAEB2"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{ flex: 1, fontSize: 16, fontWeight: '500', color: '#000000' }}
                  />
                </View>
              </View>

              {/* Password Input - Pure Style */}
              <View style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#636366', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 }}>Password</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderColor: '#E5E5EA', height: 60, paddingHorizontal: 4 }}>
                  <Ionicons name="lock-closed-outline" size={20} color="#000000" style={{ marginRight: 12 }} />
                  <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor="#AEAEB2"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    style={{ flex: 1, fontSize: 16, fontWeight: '500', color: '#000000' }}
                  />
                </View>
                {!isSignUp && (
                  <TouchableOpacity activeOpacity={0.7} style={{ alignSelf: 'flex-end', marginTop: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#000000' }}>Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!isFormValid || isLoading}
                activeOpacity={0.8}
                style={{
                  width: '100%',
                  height: 64,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 32,
                  backgroundColor: isFormValid ? '#1C1C1E' : '#F2F2F7'
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '500',
                      color: isFormValid ? '#FFFFFF' : '#AEAEB2',
                      letterSpacing: 1.5,
                      textTransform: 'uppercase'
                    }}>
                      {isSignUp ? 'Create My Account' : 'Sign In To Store'}
                    </Text>
                    {isFormValid && <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 12 }} />}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Mode Switch */}
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={toggleMode}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}
            >
              <Text style={{ color: '#636366', fontSize: 15, fontWeight: '500' }}>
                {isSignUp ? 'Already have an account?' : "New to SKJ Silvers?"}
              </Text>
              <Text style={{ color: '#000000', fontWeight: '700', fontSize: 15, marginLeft: 8 }}>
                {isSignUp ? 'Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
