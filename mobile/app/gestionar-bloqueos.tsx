import { useEffect, useState } from 'react';

import {
  View,
  Text,
  Alert,
  ScrollView,
  TouchableOpacity,
  Button,
} from 'react-native';

import * as SecureStore from 'expo-secure-store';

import { api } from '../services/api';

type Horario = {
  hora: string;
  disponible: boolean;
  bloqueado?: boolean;
  bloqueoId?: number;
};

type Profesional = {
  id: number;
  nombre: string;
  especialidad: string;
};

type Usuario = {
  rol: string;
  profesional?: {
    id: number;
  };
};

export default function GestionarBloqueosScreen() {
  const ahora = new Date();

  const fechaHoy =
    `${ahora.getFullYear()}-` +
    `${String(ahora.getMonth() + 1).padStart(2, '0')}-` +
    `${String(ahora.getDate()).padStart(2, '0')}`;

  const [fecha, setFecha] =
    useState(fechaHoy);

  const [horarios, setHorarios] =
    useState<Horario[]>([]);

  const [usuario, setUsuario] =
    useState<Usuario | null>(null);

  const [profesionales, setProfesionales] =
    useState<Profesional[]>([]);

  const [
    profesionalId,
    setProfesionalId,
  ] = useState<number | null>(null);

  useEffect(() => {
    cargarUsuario();
  }, []);

  useEffect(() => {
    if (profesionalId) {
      cargarHorarios();
    }
  }, [fecha, profesionalId]);

  function cambiarDia(dias: number) {
    const nuevaFecha = new Date(
      fecha + 'T00:00:00',
    );

    nuevaFecha.setDate(
      nuevaFecha.getDate() + dias,
    );

    const nuevaFechaTexto =
      `${nuevaFecha.getFullYear()}-` +
      `${String(
        nuevaFecha.getMonth() + 1,
      ).padStart(2, '0')}-` +
      `${String(
        nuevaFecha.getDate(),
      ).padStart(2, '0')}`;

    if (nuevaFechaTexto < fechaHoy) {
      return;
    }

    setFecha(nuevaFechaTexto);
  }

  async function cargarUsuario() {
    try {
      const token =
        await SecureStore.getItemAsync(
          'token',
        );

      const response =
        await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

      setUsuario(response.data);

      if (
        response.data.rol ===
        'PROFESIONAL'
      ) {
        setProfesionalId(
          response.data.profesional.id,
        );
      }

      if (
        response.data.rol ===
        'ADMIN'
      ) {
        cargarProfesionales();
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function cargarProfesionales() {
    try {
      const token =
        await SecureStore.getItemAsync(
          'token',
        );

      const response = await api.get(
        '/users/profesionales',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setProfesionales(response.data);

      if (response.data.length > 0) {
        setProfesionalId(
          response.data[0].id,
        );
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function cargarHorarios() {
    try {
      const token =
        await SecureStore.getItemAsync(
          'token',
        );

      const response = await api.get(
        `/citas/disponibles?fecha=${fecha}&profesionalId=${profesionalId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setHorarios(response.data);
    } catch (error: any) {
      console.log(
        error?.response?.data || error,
      );

      Alert.alert(
        'Error',
        'No se pudieron cargar horarios',
      );
    }
  }

  async function bloquearSlot(
    hora: string,
  ) {
    try {
      const token =
        await SecureStore.getItemAsync(
          'token',
        );

      await api.post(
        '/citas/bloquear-slot',
        {
          fechaHora:
            `${fecha}T${hora}:00`,

          profesionalId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      cargarHorarios();
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

  async function desbloquearSlot(
    bloqueoId: number,
  ) {
    try {
      const token =
        await SecureStore.getItemAsync(
          'token',
        );

      await api.delete(
        `/citas/dias-bloqueados/${bloqueoId}?profesionalId=${profesionalId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      cargarHorarios();
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

  async function bloquearDiaCompleto() {
    try {
      const token =
        await SecureStore.getItemAsync(
          'token',
        );

      await api.post(
        '/citas/bloquear-dia',
        {
          fecha,
          profesionalId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      Alert.alert(
        'Éxito',
        'Día bloqueado',
      );

      cargarHorarios();
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

  async function desbloquearDiaCompleto() {
    try {
      const token =
        await SecureStore.getItemAsync(
          'token',
        );

      const bloqueados =
        horarios.filter(
          (h) =>
            h.bloqueado &&
            h.bloqueoId,
        );

      for (const horario of bloqueados) {
        await api.delete(
          `/citas/dias-bloqueados/${horario.bloqueoId}?profesionalId=${profesionalId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }

      Alert.alert(
        'Éxito',
        'Día desbloqueado',
      );

      cargarHorarios();
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
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
        }}
      >
        Gestionar bloqueos
      </Text>

      {usuario?.rol === 'ADMIN' && (
        <View
          style={{
            marginTop: 20,
            gap: 10,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
            }}
          >
            Profesional
          </Text>

          {profesionales.map(
            (profesional) => (
              <TouchableOpacity
                key={profesional.id}
                onPress={() =>
                  setProfesionalId(
                    profesional.id,
                  )
                }
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderRadius: 8,
                  backgroundColor:
                    profesionalId ===
                    profesional.id
                      ? '#dbeafe'
                      : 'white',
                }}
              >
                <Text
                  style={{
                    fontWeight:
                      'bold',
                  }}
                >
                  {
                    profesional.nombre
                  }
                </Text>

                <Text>
                  {
                    profesional.especialidad
                  }
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent:
            'space-between',
          alignItems: 'center',
          marginTop: 20,
        }}
      >
        <Button
          title="←"
          onPress={() =>
            cambiarDia(-1)
          }
        />

        <Text
          style={{
            fontSize: 18,
          }}
        >
          {fecha}
        </Text>

        <Button
          title="→"
          onPress={() =>
            cambiarDia(1)
          }
        />
      </View>

      <View
        style={{
          marginTop: 20,
          gap: 10,
        }}
      >
        <Button
          title="Bloquear día completo"
          onPress={
            bloquearDiaCompleto
          }
        />

        <Button
          title="Desbloquear día completo"
          onPress={
            desbloquearDiaCompleto
          }
        />
      </View>

      <ScrollView
        style={{
          marginTop: 20,
        }}
      >
        {horarios.map((horario) => (
          <TouchableOpacity
            key={horario.hora}
            disabled={
              !horario.disponible &&
              !horario.bloqueado
            }
            onPress={() => {
              if (
                horario.bloqueado &&
                horario.bloqueoId
              ) {
                desbloquearSlot(
                  horario.bloqueoId,
                );

                return;
              }

              if (
                horario.disponible
              ) {
                bloquearSlot(
                  horario.hora,
                );
              }
            }}
            style={{
              padding: 15,
              borderWidth: 1,
              borderRadius: 8,
              marginBottom: 10,

              opacity:
                !horario.disponible &&
                !horario.bloqueado
                  ? 0.5
                  : 1,

              backgroundColor:
                horario.bloqueado
                  ? '#fecaca'
                  : horario.disponible
                    ? '#dcfce7'
                    : '#dcdcdc',
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
              }}
            >
              {horario.hora}
            </Text>

            <Text>
              {horario.bloqueado
                ? 'Bloqueado'
                : horario.disponible
                  ? 'Disponible'
                  : 'Ocupado'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}