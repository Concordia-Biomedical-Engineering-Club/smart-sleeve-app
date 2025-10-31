import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { login, register, logout } from '../../services/auth';
import { useAuth } from '../../context/authContext';

export default function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [retypePassword, setRetypePassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { user } = useAuth();

    useFocusEffect(
        useCallback(() => {
            setEmail('');
            setPassword('');
            setRetypePassword('');
            setError('');
        }, [])
    );

    const handleAuth = async () => {
        setError('');
        if (!isLogin && password !== retypePassword) {
            setError("Passwords don't match");
            return;
        }
        setLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password);
            }
            router.push('/');

        } catch (e) {
            let message = 'Authentication failed';
            if (typeof e === 'object' && e && 'message' in e) {
                message = (e as any).message;
            }
            setError(message);

        } finally {
            setLoading(false);
            
        }
    };
    
    const handleLogout = async () => {
        try {
            logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const toggleAuth = () => {
        setIsLogin(!isLogin);
        setEmail('');
        setPassword('');
        setRetypePassword('');
        setError('');
    };
    if (user) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>
            You are already logged in as {user.email}
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      );
    }
    else {
      return (
          <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerContainer}>
              <Text style={styles.projectTitle}>Smart Rehabilitation Knee Sleeve</Text>
              <Text style={styles.subtitle}>True North Biomedical 2025–2026</Text>
          </View>

          <View style={styles.authBox}>
              <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
              <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              />
              <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              />
              {!isLogin && (
              <TextInput
                  style={styles.input}
                  placeholder="Retype Password"
                  placeholderTextColor="#aaa"
                  value={retypePassword}
                  onChangeText={setRetypePassword}
                  secureTextEntry
              />
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
              style={styles.button}
              onPress={handleAuth}
              disabled={loading}
              >
              {loading ? (
                  <ActivityIndicator color="#fff" />
              ) : (
                  <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Register'}</Text>
              )}
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleAuth}>
              <Text style={styles.switch}>
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <Text style={styles.switchHighlight}>
                  {isLogin ? 'Register' : 'Login'}
                  </Text>
              </Text>
              </TouchableOpacity>
          </View>
          </View>
      );
    }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1D2E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  projectTitle: {
    color: '#E6F4F1',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6CC5C0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  authBox: {
    width: '100%',
    backgroundColor: '#132E45',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1E3B57',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C5A77',
  },
  button: {
    backgroundColor: '#00B8A9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: '#FF6B6B',
    marginBottom: 8,
    textAlign: 'center',
  },
  switch: {
    color: '#C7DDE7',
    marginTop: 16,
    textAlign: 'center',
  },
  switchHighlight: {
    color: '#00B8A9',
    fontWeight: 'bold',
  },
});
