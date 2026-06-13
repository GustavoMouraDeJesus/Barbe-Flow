import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { Appointment } from "../types/appointment";
import AdminHeader from "../components/AdminHeader";
import { API_URL } from "../services/api";

type Filter = "today" | "tomorrow" | "week" | "month" | "all";

type StoredBarbershop = {
  id?: string;
  name?: string;
  slug?: string;
};

function getStoredBarbershopName() {
  const storedBarbershop = localStorage.getItem("barbershop");

  if (!storedBarbershop) {
    return "Barbearia";
  }

  try {
    const barbershop = JSON.parse(storedBarbershop) as StoredBarbershop;

    return barbershop.name || "Barbearia";
  } catch {
    return "Barbearia";
  }
}

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

      return admin.barbershopSlug || null;
    } catch {
      console.error("Não foi possível ler os dados do administrador.");
    }
  }

  return null;
}

export default function Admin() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<Filter>("today");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [barbershopSlug] = useState<string | null>(() =>
    getStoredBarbershopSlug()
  );

  const [barbershopName] = useState(() =>
    getStoredBarbershopName()
  );

  const publicBookingLink = barbershopSlug
    ? `${window.location.origin}/${barbershopSlug}/agendamento`
    : "";

  async function handleCopyBookingLink() {
    if (!publicBookingLink) {
      return;
    }

    await navigator.clipboard.writeText(publicBookingLink);

    alert("Link de agendamento copiado com sucesso!");
  }

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
          throw new Error("Erro ao carregar agendamentos.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Resposta inválida do servidor.");
        }

        setAppointments(data);
      } catch (error) {
        console.error("Erro ao buscar agendamentos:", error);

        setErrorMessage(
          "Não foi possível carregar os agendamentos da barbearia."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [barbershopSlug]);

  function getDateByOffset(days: number) {
    const date = new Date();

    date.setDate(date.getDate() + days);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function isDateInCurrentWeek(dateString: string) {
    const appointmentDate = new Date(`${dateString}T00:00:00`);
    const today = new Date();

    const startOfWeek = new Date(today);

    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);

    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return (
      appointmentDate >= startOfWeek &&
      appointmentDate <= endOfWeek
    );
  }

  function isDateInCurrentMonth(dateString: string) {
    const appointmentDate = new Date(`${dateString}T00:00:00`);
    const today = new Date();

    return (
      appointmentDate.getMonth() === today.getMonth() &&
      appointmentDate.getFullYear() === today.getFullYear()
    );
  }

  function formatDate(dateString: string) {
    const [year, month, day] = dateString.split("-");

    return `${day}/${month}/${year}`;
  }

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const today = getDateByOffset(0);
  const tomorrow = getDateByOffset(1);

  const todayAppointments = appointments.filter(
    (appointment) => appointment.date === today
  );

  const tomorrowAppointments = appointments.filter(
    (appointment) => appointment.date === tomorrow
  );

  const weekAppointments = appointments.filter((appointment) =>
    isDateInCurrentWeek(appointment.date)
  );

  const monthAppointments = appointments.filter((appointment) =>
    isDateInCurrentMonth(appointment.date)
  );

  const filteredAppointments =
    filter === "today"
      ? todayAppointments
      : filter === "tomorrow"
        ? tomorrowAppointments
        : filter === "week"
          ? weekAppointments
          : filter === "month"
            ? monthAppointments
            : appointments;

  const sortedFilteredAppointments = [
    ...filteredAppointments,
  ].sort((a, b) => {
    if (a.date === b.date) {
      return a.time.localeCompare(b.time);
    }

    return a.date.localeCompare(b.date);
  });

  const totalToday = todayAppointments.reduce(
    (total, appointment) => total + appointment.price,
    0
  );

  const totalTomorrow = tomorrowAppointments.reduce(
    (total, appointment) => total + appointment.price,
    0
  );

  const totalWeek = weekAppointments.reduce(
    (total, appointment) => total + appointment.price,
    0
  );

  const totalMonth = monthAppointments.reduce(
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
                Painel Administrativo
              </span>

              <h1 className="text-4xl font-bold mt-3">
                Dashboard da {barbershopName}
              </h1>

              <p className="text-zinc-400 mt-3">
                Acompanhe os agendamentos e o faturamento da sua barbearia.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
  to="/admin/funcionamento"
  className="bg-zinc-900 text-white border border-zinc-700 px-5 py-3 rounded-lg font-semibold hover:bg-zinc-800 transition w-fit"
>
  Horário de Funcionamento
</Link>
              <Link
                to="/admin/servicos"
                className="bg-zinc-900 text-white border border-zinc-700 px-5 py-3 rounded-lg font-semibold hover:bg-zinc-800 transition w-fit"
              >
                Gerenciar Serviços
              </Link>

              <Link
                to="/admin/funcionarios"
                className="bg-zinc-900 text-white border border-zinc-700 px-5 py-3 rounded-lg font-semibold hover:bg-zinc-800 transition w-fit"
              >
                Gerenciar Funcionários
              </Link>

              <Link
                to="/admin/dia"
                className="bg-white text-black px-5 py-3 rounded-lg font-semibold hover:scale-105 transition w-fit"
              >
                Painel do Dia
              </Link>

              <Link
  to="/admin/aparencia"
  className="bg-zinc-900 text-white border border-zinc-700 px-5 py-3 rounded-lg font-semibold hover:bg-zinc-800 transition w-fit"
>
  Aparência da página
</Link>

<Link
  to="/admin/galeria"
  className="bg-zinc-900 text-white border border-zinc-700 px-5 py-3 rounded-lg font-semibold hover:bg-zinc-800 transition w-fit"
>
  Galeria da Barbearia
</Link>
            </div>
          </div>

          

          {publicBookingLink && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 mb-8">
              <h2 className="text-2xl font-bold">
                Link de agendamento da barbearia
              </h2>

              <p className="text-zinc-400 mt-2">
                Envie este link para seus clientes fazerem agendamentos.
              </p>

              <div className="mt-5 flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={publicBookingLink}
                  readOnly
                  className="flex-1 bg-black border border-zinc-800 rounded-lg px-4 py-3 text-zinc-300 outline-none"
                />

                <button
                  type="button"
                  onClick={handleCopyBookingLink}
                  className="bg-white text-black px-5 py-3 rounded-lg font-semibold hover:scale-105 transition cursor-pointer"
                >
                  Copiar link
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-8 bg-red-500/10 border border-red-500 text-red-400 rounded-xl p-4">
              {errorMessage}
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">
                Agendamentos hoje
              </p>

              <h2 className="text-4xl font-bold mt-2">
                {todayAppointments.length}
              </h2>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">
                Agendamentos amanhã
              </p>

              <h2 className="text-4xl font-bold mt-2">
                {tomorrowAppointments.length}
              </h2>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">
                Agendamentos da semana
              </p>

              <h2 className="text-4xl font-bold mt-2">
                {weekAppointments.length}
              </h2>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">
                Agendamentos do mês
              </p>

              <h2 className="text-4xl font-bold mt-2">
                {monthAppointments.length}
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">
                Faturamento hoje
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {formatCurrency(totalToday)}
              </h2>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">
                Faturamento amanhã
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {formatCurrency(totalTomorrow)}
              </h2>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">
                Faturamento da semana
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {formatCurrency(totalWeek)}
              </h2>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400">
                Faturamento do mês
              </p>

              <h2 className="text-3xl font-bold mt-2">
                {formatCurrency(totalMonth)}
              </h2>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold">
                  Agendamentos
                </h2>

                <p className="text-zinc-400 mt-2">
                  Filtre os horários por hoje, amanhã, semana, mês ou todos.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setFilter("today")}
                  className={`px-4 py-2 rounded-lg font-semibold transition cursor-pointer ${
                    filter === "today"
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-white border border-zinc-800"
                  }`}
                >
                  Hoje
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("tomorrow")}
                  className={`px-4 py-2 rounded-lg font-semibold transition cursor-pointer ${
                    filter === "tomorrow"
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-white border border-zinc-800"
                  }`}
                >
                  Amanhã
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("week")}
                  className={`px-4 py-2 rounded-lg font-semibold transition cursor-pointer ${
                    filter === "week"
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-white border border-zinc-800"
                  }`}
                >
                  Semana
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("month")}
                  className={`px-4 py-2 rounded-lg font-semibold transition cursor-pointer ${
                    filter === "month"
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-white border border-zinc-800"
                  }`}
                >
                  Mês
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-lg font-semibold transition cursor-pointer ${
                    filter === "all"
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-white border border-zinc-800"
                  }`}
                >
                  Todos
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            {loading ? (
              <p className="text-zinc-400 p-6">
                Carregando agendamentos...
              </p>
            ) : sortedFilteredAppointments.length === 0 ? (
              <p className="text-zinc-400 p-6">
                Nenhum agendamento encontrado para esse filtro.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-900 text-zinc-400">
                    <tr>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Serviço</th>
                      <th className="p-4">Profissional</th>
                      <th className="p-4">Data</th>
                      <th className="p-4">Horário</th>
                      <th className="p-4">Valor</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedFilteredAppointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className="border-t border-zinc-800 text-zinc-300"
                      >
                        <td className="p-4">
                          {appointment.clientName}
                        </td>

                        <td className="p-4">
                          {appointment.serviceName}
                        </td>

                        <td className="p-4">
                          {appointment.professionalName}

                          <br />

                          <span className="text-sm text-zinc-500">
                            {appointment.professionalSpecialty}
                          </span>
                        </td>

                        <td className="p-4">
                          {formatDate(appointment.date)}
                        </td>

                        <td className="p-4">
                          {appointment.time}
                        </td>

                        <td className="p-4 font-semibold text-white">
                          {formatCurrency(appointment.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}