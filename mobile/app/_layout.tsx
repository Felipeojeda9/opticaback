import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2563eb',
        },

        headerTintColor: '#fff',

        headerTitleStyle: {
          fontWeight: 'bold',
        },

        contentStyle: {
          backgroundColor: '#f5f5f5',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Login',
        }}
      />

      <Stack.Screen
        name="home"
        options={{
          title: 'Inicio',
        }}
      />

      <Stack.Screen
        name="citas"
        options={{
          title: 'Mis citas',
        }}
      />

      <Stack.Screen
        name="reservar"
        options={{
          title: 'Reservar hora',
        }}
      />

      <Stack.Screen
        name="reservar-admin"
        options={{
          title: 'Reservar para paciente',
        }}
      />

      <Stack.Screen
        name="crear-paciente"
        options={{
          title: 'Crear paciente',
        }}
      />

      <Stack.Screen
        name="crear-profesional"
        options={{
          title: 'Crear profesional',
        }}
      />

      <Stack.Screen
        name="gestionar-bloqueos"
        options={{
          title: 'Gestionar bloqueos',
        }}
      />
    </Stack>
  );
}