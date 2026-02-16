import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import api from '../services/api';
import useUserData from '../store/userSignUp'; // Import your store to save user data

const logoSource = require('../assets/images/LiquidCrest_Logo.png');

const SplashScreen = () => {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const { updateUserData } = useUserData(); // Extract the update function from your store

  useEffect(() => {
    const checkLogin = async () => {
      try {
        // FIXED: Using the relative path because baseURL already handles /api/v1
        const res = await api.get('/users/me');
        
        if (res.data) {
          // Update your store with the fresh user data from the server
          updateUserData({
            funame: res.data.full_name,
            email: res.data.email,
            role: res.data.role,
            branch: res.data.branch
          });
          
          console.log("Auto-login successful, redirecting to dashboard...");
          router.replace('/(tabs)/managerDashboard'); // Or your default home tab
        }
      } catch (err) {
        console.log("Token invalid or expired, redirecting to Login.");
        // We don't need an alert here, just let the timer handle the login redirect
      }
    };
    checkLogin();
  }, []);

  useEffect(() => {
    const zoomSequence = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.06,
        duration: 900,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.cubic),
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 900,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.cubic),
      }),
    ]);

    zoomSequence.start();

    const timer = setTimeout(() => {
      // Only navigate to login if the checkLogin above hasn't already moved us to tabs
      router.replace('/login'); 
      console.log("Splash screen duration finished.");
    }, 4000); 

    return () => {
      zoomSequence.stop();
      clearTimeout(timer); 
    };
  }, [scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={logoSource}
        style={[styles.logo, { transform: [{ scale: scaleAnim }] }]}
        resizeMode="contain"
        accessibilityLabel="App logo splash"
      />
    </View>
  );
};

const { width } = Dimensions.get('window');
const LOGO_SIZE = Math.min(260, width * 0.56);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7EC7FF', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});

export default SplashScreen;