import React, { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { View, Animated, StyleSheet, Dimensions, Image, Easing } from 'react-native';

// Replace this with your actual logo image source
const logoSource = require('../assets/images/LiquidCrest_Logo.png');

const SplashScreen = () => {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    // We remove Animated.loop() to make the animation play only once
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
       // You can add more repeats here if needed before the timeout
    ]);

    zoomSequence.start();

    // Set a timeout to navigate away after the splash screen finishes
    const timer = setTimeout(() => {
        router.replace('./login'); // Navigate to your main tabs
      console.log("Splash screen duration finished, time to navigate to the main app.");
    }, 4000); // 4000 milliseconds = 4 seconds

    return () => {
        zoomSequence.stop();
        clearTimeout(timer); // Always clean up timers
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
    backgroundColor: '#7EC7FF', // sky-blue background
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});

export default SplashScreen;
