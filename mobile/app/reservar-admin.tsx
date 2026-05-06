import { useEffect, useState } from 'react';

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Button,
} from 'react-native';

import * as SecureStore from 'expo-secure-store';

import { api } from '../services/api';

type Paciente = {
  id: number;
  nombre: string;
  rut: string;
};

type Horario = {
  hora: string;
  disponible: boolean;
};

type Usuario = {
  rol: string;
};

export default function ReservarAdminScreen() {
  const hoy = new Date();

  const fechaHoy = hoy.toISOString().substring(0, 10);

  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const [fecha, setFecha] = useState(fechaHoy);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  const [pacienteSeleccionado, setPacienteSeleccionado] =
    useState<Paciente | null>(null);

  const [horarios, setHorarios] = useState<Horario[]>([]);

  useEffect(() => {
    validarAdmin();
  }, []);

  useEffect(() => {
    if (pacienteSeleccionado) {
      cargarHorarios();
    }
  }, [fecha, pacienteSeleccionado]);

  async function validarAdmin() {
    try {
      const token = await SecureStore.getItemAsync('token');

      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsuario(response.data);

      if (response.data.rol !== 'ADMIN') {
        Alert.alert(
          'Acceso denegado',
          'Solo administradores pueden acceder aquí',
        );

        return;
      }

      cargarPacientes();
    } catch (error) {
      console.log(error);

      Alert.alert(
        'Error',
        'No se pudo validar usuario',
      );
    }
  }

  function cambiarDia(dias: number) {
    const nuevaFecha = new Date(fecha);

    nuevaFecha.setDate(nuevaFecha.getDate() + dias);

    const nuevaFechaTexto = nuevaFecha
      .toISOString()
      .substring(0, 10);

    if (nuevaFechaTexto < fechaHoy) {
      return;
    }

    setFecha(nuevaFechaTexto);
  }

  async function cargarPacientes() {
    try {
      const token = await SecureStore.getItemAsync('token');

      const response = await api.get('/users/pacientes', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPacientes(response.data);
    } catch (error) {
      console.log(error);

      Alert.alert(
        'Error',
        'No se pudieron cargar pacientes',
      );
    }
  }

  async function cargarHorarios() {
    try {
      const token = await SecureStore.getItemAsync('token');

      const response = await api.get(
        `/citas/disponibles?fecha=${fecha}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setHorarios(response.data);
    } catch (error) {
      console.log(error);

      Alert.alert(
        'Error',
        'No se pudieron cargar horarios',
      );
    }
  }

  async function reservarHorario(horario: string) {
    if (!pacienteSeleccionado) {
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('token');

      const fechaHora = `${fecha}T${horario}:00`;

      await api.post(
        '/citas',
        {
          fechaHora,
          profesionalId: 1,
          pacienteId: pacienteSeleccionado.id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      Alert.alert(
        'Éxito',
        'Hora reservada para paciente',
      );

      cargarHorarios();
    } catch (error: any) {
      console.log(
        'ERROR RESERVA',
        error?.response?.data || error,
      );

      Alert.alert(
        'Error',
        JSON.stringify(error?.response?.data || error),
      );
    }
  }

  if (usuario && usuario.rol !== 'ADMIN') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18 }}>
          Acceso restringido
        </Text>
      </View>
    );
  }

  if (!pacienteSeleccionado) {
    return (
      <View style={{ flex: 1, padding: 20 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: 'bold',
          }}
        >
          Seleccionar paciente
        </Text>

        <ScrollView style={{ marginTop: 20 }}>
          {pacientes.map((paciente) => (
            <TouchableOpacity
              key={paciente.id}
              style={{
                padding: 15,
                borderWidth: 1,
                borderRadius: 8,
                marginBottom: 10,
              }}
              onPress={() =>
                setPacienteSeleccionado(paciente)
              }
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                }}
              >
                {paciente.nombre}
              </Text>

              <Text>{paciente.rut}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
        }}
      >
        Reservar para:
      </Text>

      <Text
        style={{
          fontSize: 20,
          marginTop: 10,
        }}
      >
        {pacienteSeleccionado.nombre}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 20,
        }}
      >
        <Button title="←" onPress={() => cambiarDia(-1)} />

        <Text style={{ fontSize: 18 }}>
          {fecha}
        </Text>

        <Button title="→" onPress={() => cambiarDia(1)} />
      </View>

      <ScrollView style={{ marginTop: 20 }}>
        {horarios.map((horario) => (
          <TouchableOpacity
            key={horario.hora}
            disabled={!horario.disponible}
            onPress={() =>
              reservarHorario(horario.hora)
            }
            style={{
              padding: 15,
              borderWidth: 1,
              borderRadius: 8,
              marginBottom: 10,
              opacity: horario.disponible ? 1 : 0.4,
              backgroundColor: horario.disponible
                ? 'white'
                : '#dcdcdc',
            }}
          >
            <Text style={{ fontSize: 18 }}>
              {horario.hora}
            </Text>

            <Text>
              {horario.disponible
                ? 'Disponible'
                : 'Ocupado'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}