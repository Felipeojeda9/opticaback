import { useEffect, useState } from 'react';

import {
  View,
  Text,
  Button,
  Alert,
} from 'react-native';

import * as SecureStore from 'expo-secure-store';

import { useRouter } from 'expo-router';

import { api } from '../services/api';

type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: string;
};

export default function HomeScreen() {
  const router = useRouter();

  const [usuario, setUsuario] =
    useState<Usuario | null>(null);

  useEffect(() => {
    cargarUsuario();
  }, []);

  async function cargarUsuario() {
    try {
      const token =
        await SecureStore.getItemAsync(
          'token',
        );

      if (!token) {
        router.replace('/');

        return;
      }

      const response = await api.get(
        '/auth/me',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setUsuario(response.data);
    } catch (error) {
      console.log(error);

      Alert.alert(
        'Error',
        'No se pudo cargar el usuario',
      );

      await SecureStore.deleteItemAsync(
        'token',
      );

      router.replace('/');
    }
  }

  async function handleLogout() {
    await SecureStore.deleteItemAsync(
      'token',
    );

    router.replace('/');
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        gap: 12,
      }}
    >
      <Text
        style={{
          fontSize: 26,
          fontWeight: 'bold',
        }}
      >
        Óptica Zeus
      </Text>

      {usuario ? (
        <View style={{ gap: 6 }}>
          <Text>
            Nombre: {usuario.nombre}
          </Text>

          <Text>
            Email: {usuario.email}
          </Text>

          <Text>
            Rol: {usuario.rol}
          </Text>
        </View>
      ) : (
        <Text>Cargando usuario...</Text>
      )}

      <Button
        title="Ver citas"
        onPress={() =>
          router.push('/citas')
        }
      />

      {usuario?.rol === 'PACIENTE' && (
        <Button
          title="Reservar hora"
          onPress={() =>
            router.push('/reservar')
          }
        />
      )}

      {usuario?.rol === 'PROFESIONAL' && (
        <Button
          title="Gestionar bloqueos"
          onPress={() =>
            router.push(
              '/gestionar-bloqueos',
            )
          }
        />
      )}

      {usuario?.rol === 'ADMIN' && (
        <>
          <Button
            title="Reservar para paciente"
            onPress={() =>
              router.push(
                '/reservar-admin',
              )
            }
          />

          <Button
            title="Gestionar bloqueos"
            onPress={() =>
              router.push(
                '/gestionar-bloqueos',
              )
            }
          />

          <Button
            title="Crear paciente"
            onPress={() =>
              router.push(
                '/crear-paciente',
              )
            }
          />

          <Button
            title="Crear profesional"
            onPress={() =>
              router.push(
                '/crear-profesional',
              )
            }
          />
        </>
      )}

      <Button
        title="Cerrar sesión"
        onPress={handleLogout}
      />
    </View>
  );
}