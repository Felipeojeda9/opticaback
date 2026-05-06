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
};

type Profesional = {
  id: number;
  nombre: string;
  especialidad: string;
};

export default function ReservarScreen() {
  const ahora = new Date();

  const fechaHoy =
    `${ahora.getFullYear()}-` +
    `${String(ahora.getMonth() + 1).padStart(2, '0')}-` +
    `${String(ahora.getDate()).padStart(2, '0')}`;

  const [fecha, setFecha] = useState(fechaHoy);

  const [horarios, setHorarios] = useState<
    Horario[]
  >([]);

  const [profesionales, setProfesionales] =
    useState<Profesional[]>([]);

  const [
    profesionalSeleccionado,
    setProfesionalSeleccionado,
  ] = useState<number | null>(null);

  useEffect(() => {
    cargarProfesionales();
  }, []);

  useEffect(() => {
    if (profesionalSeleccionado) {
      cargarHorarios();
    }
  }, [fecha, profesionalSeleccionado]);

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

  function esHorarioPasado(
    hora: string,
  ) {
    if (fecha !== fechaHoy) {
      return false;
    }

    const ahora = new Date();

    const [h, m] = hora
      .split(':')
      .map(Number);

    const fechaHorario = new Date();

    fechaHorario.setHours(h);
    fechaHorario.setMinutes(m);
    fechaHorario.setSeconds(0);
    fechaHorario.setMilliseconds(0);

    return (
      fechaHorario.getTime() <=
      ahora.getTime()
    );
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
        setProfesionalSeleccionado(
          response.data[0].id,
        );
      }
    } catch (error) {
      console.log(error);

      Alert.alert(
        'Error',
        'No se pudieron cargar profesionales',
      );
    }
  }

  async function cargarHorarios() {
    try {
      const token =
        await SecureStore.getItemAsync(
          'token',
        );

      const response = await api.get(
        `/citas/disponibles?fecha=${fecha}&profesionalId=${profesionalSeleccionado}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setHorarios(response.data);
    } catch (error: any) {
      console.log(
        'ERROR HORARIOS',
        error?.response?.data || error,
      );

      Alert.alert(
        'Error',
        'No se pudieron cargar horarios',
      );
    }
  }

  async function reservarHorario(
    horario: string,
  ) {
    if (!profesionalSeleccionado) {
      return;
    }

    try {
      const token =
        await SecureStore.getItemAsync(
          'token',
        );

      const fechaHora =
        `${fecha}T${horario}:00`;

      await api.post(
        '/citas',
        {
          fechaHora,
          profesionalId:
            profesionalSeleccionado,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      Alert.alert(
        'Éxito',
        'Hora reservada',
      );

      cargarHorarios();
    } catch (error: any) {
      console.log(
        'ERROR RESERVA',
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
        Reservar hora
      </Text>

      <Text
        style={{
          fontSize: 18,
          marginTop: 20,
          marginBottom: 10,
        }}
      >
        Profesional
      </Text>

      {profesionales.map(
        (profesional) => (
          <TouchableOpacity
            key={profesional.id}
            onPress={() =>
              setProfesionalSeleccionado(
                profesional.id,
              )
            }
            style={{
              padding: 12,
              borderWidth: 1,
              borderRadius: 8,
              marginBottom: 10,
              backgroundColor:
                profesionalSeleccionado ===
                profesional.id
                  ? '#dbeafe'
                  : 'white',
            }}
          >
            <Text
              style={{
                fontWeight: 'bold',
              }}
            >
              {profesional.nombre}
            </Text>

            <Text>
              {
                profesional.especialidad
              }
            </Text>
          </TouchableOpacity>
        ),
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

      <ScrollView
        style={{
          marginTop: 20,
        }}
      >
        {horarios.length === 0 ? (
          <Text>
            No hay horarios
            disponibles.
          </Text>
        ) : (
          horarios.map((horario) => {
            const pasado =
              esHorarioPasado(
                horario.hora,
              );

            const disponibleReal =
              horario.disponible &&
              !pasado;

            let estadoTexto =
              'Disponible';

            if (pasado) {
              estadoTexto =
                'Horario pasado';
            } else if (
              horario.bloqueado
            ) {
              estadoTexto =
                'Bloqueado por profesional';
            } else if (
              !horario.disponible
            ) {
              estadoTexto =
                'Ocupado';
            }

            return (
              <TouchableOpacity
                key={horario.hora}
                disabled={
                  !disponibleReal
                }
                onPress={() =>
                  reservarHorario(
                    horario.hora,
                  )
                }
                style={{
                  padding: 15,
                  borderWidth: 1,
                  borderRadius: 8,
                  marginBottom: 10,
                  opacity:
                    disponibleReal
                      ? 1
                      : 0.4,
                  backgroundColor:
                    horario.bloqueado
                      ? '#fecaca'
                      : disponibleReal
                        ? 'white'
                        : '#dcdcdc',
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                  }}
                >
                  {horario.hora}
                </Text>

                <Text>
                  {estadoTexto}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}