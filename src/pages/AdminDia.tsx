import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AdminHeader from "../components/AdminHeader";
import { API_URL } from "../services/api";
import type { Appointment, AppointmentStatus } from "../types/appointment";

type StoredBarbershop = {
  id?: string;
  name?: string;
  slug?: string;
};

function getStoredBarbershopSlug() {
  const directSlug = localStorage.getItem("barbershopSlug");

  if (directSlug) {
    return directSlug;
  }

  const storedBarbershop = localStorage.getItem("barbershop");

  if (storedBarbershop) {
    try {
      const barbershop = JSON.parse(
        storedBarbershop
      ) as StoredBarbershop;

      if (barbershop.slug) {
        return barbershop.slug;
      }
    } catch {
      console.error("Não foi possível ler os dados da barbearia.");
    }
  }

  const storedAdmin = localStorage.getItem("admin");

  if (storedAdmin) {
    try {
      const admin = JSON.parse(storedAdmin) as {
        barbershopSlug?: string;
      };

      if (admin.barbershopSlug) {
        return admin.barbershopSlug;
      }
    } catch {
      console.error("Não foi possível ler os dados do administrador.");
    }
  }

  return null;
}

export default function AdminDia() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [barbershopSlug] = useState<string | null>(() =>
    getStoredBarbershopSlug()
  );

  useEffect(() => {
    async function loadAppointments() {
      if (!barbershopSlug) {
        setErrorMessage(
          "Não foi possível identificar a barbearia desta conta. Faça login novamente."
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `${API_URL}/barbershops/${barbershopSlug}/appointments`
        );

        if (!response.ok) {
          throw new Error("Erro ao carregar agendamentos");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Resposta inválida do servidor.");
        }

        setAppointments(data);
      } catch (error) {
        console.error("Erro ao buscar agendamentos:", error);

        setErrorMessage(
          "Não foi possível carregar os agendamentos do dia."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [barbershopSlug]);

  function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDateToBrazilian(date: string) {
    const [year, month, day] = date.split("-");

    return `${day}/${month}/${year}`;
  }

  function getPhoneNumbers(phone?: string) {
    return phone?.replace(/\D/g, "") || "";
  }

  function phoneIsValid(phone?: string) {
    const phoneNumbers = getPhoneNumbers(phone);

    return phoneNumbers.length >= 10 && phoneNumbers.length <= 13;
  }

  function getWhatsAppLink(appointment: Appointment) {
    const phoneNumbers = getPhoneNumbers(appointment.clientPhone);

    if (!phoneIsValid(appointment.clientPhone)) {
      return "";
    }

    const phoneWithCountryCode = phoneNumbers.startsWith("55")
      ? phoneNumbers
      : `55${phoneNumbers}`;

    const message = encodeURIComponent(
      `Olá, ${appointment.clientName}! Tudo bem? Aqui é da barbearia. Estou entrando em contato sobre seu agendamento de ${appointment.serviceName} no dia ${formatDateToBrazilian(
        appointment.date
      )} às ${appointment.time}, você confirma o agendamento?`
    );

    return `https://api.whatsapp.com/send?phone=${phoneWithCountryCode}&text=${message}`;
  }

  function handleOpenWhatsApp(appointment: Appointment) {
    const whatsappLink = getWhatsAppLink(appointment);

    if (!whatsappLink) {
      alert(
        "Este agendamento não possui um WhatsApp válido. Verifique se o cliente informou o telefone com DDD."
      );

      return;
    }

    window.open(whatsappLink, "_blank", "noopener,noreferrer");
  }

  async function updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus
  ) {
    if (!barbershopSlug) {
      alert("Barbearia não identificada. Faça login novamente.");
      navigate("/admin/login");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/barbershops/${barbershopSlug}/appointments/${appointmentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        alert("Erro ao atualizar status do agendamento.");
        return;
      }

      const updatedAppointment = await response.json();

      setAppointments((prevAppointments) =>
        prevAppointments.map((appointment) =>
          appointment.id === appointmentId
            ? updatedAppointment
            : appointment
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Não foi possível conectar com o servidor.");
    }
  }

  function handleChangeStatus(
    appointmentId: string,
    status: AppointmentStatus,
    clientName: string
  ) {
    const statusLabel =
      status === "completed"
        ? "concluído"
        : status === "canceled"
          ? "cancelado"
          : "pendente";

    const confirmChange = window.confirm(
      `Tem certeza que deseja marcar o agendamento de ${clientName} como ${statusLabel}?`
    );

    if (!confirmChange) {
      return;
    }

    updateAppointmentStatus(appointmentId, status);
  }

  function getStatusLabel(status: AppointmentStatus) {
    if (status === "pending") return "Pendente";
    if (status === "completed") return "Concluído";
    return "Cancelado";
  }

  function getStatusClass(status: AppointmentStatus) {
    if (status === "pending") {
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500";
    }

    if (status === "completed") {
      return "bg-green-500/10 text-green-400 border-green-500";
    }

    return "bg-red-500/10 text-red-400 border-red-500";
  }

  const today = getTodayDate();

  const todayAppointments = appointments
    .filter((appointment) => appointment.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const pendingToday = todayAppointments.filter(
    (appointment) => appointment.status === "pending"
  );

  const completedToday = todayAppointments.filter(
    (appointment) => appointment.status === "completed"
  );

  const canceledToday = todayAppointments.filter(
    (appointment) => appointment.status === "canceled"
  );

  const totalCompletedToday = completedToday.reduce(
    (total, appointment) => total + appointment.price,
    0
  );

  return (
    <>
      <AdminHeader />

      <main className="min-h-screen bg-black text-white px-6 py-10">
        <section className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <span className="text-zinc-400 uppercase tracking-widest">
                Painel do Dia
              </span>

              <h1 className="text-4xl font-bold mt-3">
                Agenda de hoje
              </h1>

              <p className="text-zinc-400 mt-3">
                Controle os serviços pendentes, concluídos e cancelados
                do dia.
              </p>
            </div>

            <Link
              to="/admin"
              className="bg-white text-black px-5 py-3 rounded-lg font-semibold hover:scale-105 transition w-fit"
            >
              Ver dashboard completo
            </Link>
          </div>

          {errorMessage && (
            <div className="mb-8 bg-red-500/10 border border-red-500 text-red-400 rounded-xl p-4">
              {errorMessage}
            </div>
          )}

          <div className="grid md:grid-cols-4 gap-6 mb-10">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">Agendamentos hoje</p>

              <h2 className="text-5xl font-bold mt-3">
                {todayAppointments.length}
              </h2>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">Pendentes</p>

              <h2 className="text-5xl font-bold mt-3 text-yellow-400">
                {pendingToday.length}
              </h2>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">Concluídos</p>

              <h2 className="text-5xl font-bold mt-3 text-green-400">
                {completedToday.length}
              </h2>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">Faturamento realizado</p>

              <h2 className="text-3xl font-bold mt-4">
                {formatCurrency(totalCompletedToday)}
              </h2>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-2xl font-bold">
                Agendamentos de hoje
              </h2>

              <p className="text-zinc-400 mt-2">
                Lista organizada por horário.
              </p>
            </div>

            {loading ? (
              <p className="text-zinc-400 p-6">
                Carregando agendamentos...
              </p>
            ) : todayAppointments.length === 0 ? (
              <p className="text-zinc-400 p-6">
                Nenhum agendamento marcado para hoje.
              </p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {todayAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-6 grid lg:grid-cols-7 gap-6 items-center"
                  >
                    <div>
                      <p className="text-zinc-500 text-sm">
                        Cliente
                      </p>

                      <p className="text-lg font-semibold text-white">
                        {appointment.clientName}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-500 text-sm">
                        WhatsApp
                      </p>

                      <p className="text-lg font-semibold text-white">
                        {appointment.clientPhone || "Não informado"}
                      </p>

                      {phoneIsValid(appointment.clientPhone) ? (
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(appointment)}
                          className="text-sm text-green-400 hover:underline cursor-pointer"
                        >
                          Chamar no WhatsApp
                        </button>
                      ) : (
                        <p className="text-sm text-zinc-600">
                          Sem WhatsApp válido
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-zinc-500 text-sm">
                        Serviço
                      </p>

                      <p className="text-lg font-semibold text-white">
                        {appointment.serviceName}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-500 text-sm">
                        Profissional
                      </p>

                      <p className="text-lg font-semibold text-white">
                        {appointment.professionalName}
                      </p>

                      <p className="text-sm text-zinc-500">
                        {appointment.professionalSpecialty}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-500 text-sm">
                        Horário
                      </p>

                      <p className="text-2xl font-bold text-white">
                        {appointment.time}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-500 text-sm">
                        Valor
                      </p>

                      <p className="text-xl font-bold text-white">
                        {formatCurrency(appointment.price)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <span
                        className={`w-fit px-3 py-1 rounded-full border text-sm font-semibold ${getStatusClass(
                          appointment.status
                        )}`}
                      >
                        {getStatusLabel(appointment.status)}
                      </span>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleChangeStatus(
                              appointment.id,
                              "completed",
                              appointment.clientName
                            )
                          }
                          disabled={
                            appointment.status === "completed"
                          }
                          className="bg-green-500/10 text-green-400 border border-green-500 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-500 hover:text-black transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Concluir
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleChangeStatus(
                              appointment.id,
                              "canceled",
                              appointment.clientName
                            )
                          }
                          disabled={
                            appointment.status === "canceled"
                          }
                          className="bg-red-500/10 text-red-400 border border-red-500 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-500 hover:text-black transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleChangeStatus(
                              appointment.id,
                              "pending",
                              appointment.clientName
                            )
                          }
                          disabled={
                            appointment.status === "pending"
                          }
                          className="bg-zinc-900 text-zinc-300 border border-zinc-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-white hover:text-black transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Reabrir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canceledToday.length > 0 && (
              <div className="p-6 border-t border-zinc-800 text-zinc-500">
                Cancelados hoje: {canceledToday.length}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
