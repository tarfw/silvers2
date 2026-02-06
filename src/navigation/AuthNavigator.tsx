import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { AuthScreen } from '../screens/AuthScreen';

export type AuthStackParamList = {
    Welcome: undefined;
    SignIn: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="Welcome">
                {(props) => (
                    <WelcomeScreen
                        onSignInWithEmail={() => props.navigation.navigate('SignIn')}
                        onContinueWithGoogle={() => {
                            // TODO: Implement Google Sign In
                            console.log('Google Sign In');
                        }}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="SignIn" component={AuthScreen} />
        </Stack.Navigator>
    );
}
