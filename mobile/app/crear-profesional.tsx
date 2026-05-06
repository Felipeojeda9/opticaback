import { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
} from 'react-native';

import { api } from '../services/api';

export default function CrearProfesionalScreen() {
  const [nombre, setNombre] = useState('');

  const [email, setEmail] = useState('');

  const [password, setPassword] =
    useState('');

  const [rut, setRut] = useState('');

  const [especialidad, setEspecialidad] =
    useState('');

  async function crearProfesional() {
    try {
      await api.post('/auth/register', {
        nombre,
        email,
        password,
        rol: 'PROFESIONAL',
        rut,
        especialidad,
      });

      Alert.alert(
        'Éxito',
        'Profesional creado correctamente',
      );

      setNombre('');
      setEmail('');
      setPassword('');
      setRut('');
      setEspecialidad('');
    } catch (error: any) {
      console.log(
        error?.response?.data || error,
      );

      Alert.alert(
        'Error',
        JSON.stringify(
          error?.response?.data || error,
        ),
      );
    }
  }

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        gap: 12,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
        }}
      >
        Crear profesional
      </Text>

      <TextInput
        placeholder="Nombre"
        value={nombre}
        onChangeText={setNombre}
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
        }}
      />

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
        }}
      />

      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
        }}
      />

      <TextInput
        placeholder="RUT"
        value={rut}
        onChangeText={setRut}
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
        }}
      />

      <TextInput
        placeholder="Especialidad"
        value={especialidad}
        onChangeText={setEspecialidad}
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
        }}
      />

      <Button
        title="Crear profesional"
        onPress={crearProfesional}
      />
    </View>
  );
}