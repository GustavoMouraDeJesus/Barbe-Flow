import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useParams } from "react-router-dom";

import { API_URL } from "../services/api";
import type { Service } from "../types/Service";
import type { Professional } from "../types/Professional";
import type { Barbershop } from "../types/Barbershop";

type AppointmentForm = {
  clientName: string;
  clientPhone: string;
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
};

type ApiErrorResponse = {
  detail?: string | { msg?: string }[];
};

export default function Agendamentos() {
  const { slug } = useParams();

  const barbershopSlug = slug || "toid";

  const today = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  const [formData, setFormData] = useState<AppointmentForm>({
    clientName: "",
    clientPhone: "",
    serviceId: "",
    professionalId: "",
    date: "",
    time: "",
  });

  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingTimes, setLoadingTimes] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);
        setErrorMessage("");

        const barbershopResponse = await fetch(
          `${API_URL}/barbershops/${barbershopSlug}`
        );

        const servicesResponse = await fetch(
          `${API_URL}/barbershops/${barbershopSlug}/services`
        );

        const professionalsResponse = await fetch(
          `${API_URL}/barbershops/${barbershopSlug}/professionals`
        );

        if (
          !barbershopResponse.ok ||
          !servicesResponse.ok ||
          !professionalsResponse.ok
        ) {
          throw new Error("Erro ao carregar dados da barbearia.");
        }

        const barbershopData = await barbershopResponse.json();
        const servicesData = await servicesResponse.json();
        const professionalsData = await professionalsResponse.json();

        setBarbershop(barbershopData);
        setServices(servicesData);
        setProfessionals(professionalsData);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);

        setErrorMessage(
          "Não foi possível carregar os dados da barbearia."
        );
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [barbershopSlug]);

  useEffect(() => {
    async function loadAvailableTimes() {
      if (
        !formData.serviceId ||
        !formData.professionalId ||
        !formData.date
      ) {
        setAvailableTimes([]);
        return;
      }

      try {
        setLoadingTimes(true);
        setErrorMessage("");

        const params = new URLSearchParams({
          serviceId: formData.serviceId,
          professionalId: formData.professionalId,
          date: formData.date,
        });

        const response = await fetch(
          `${API_URL}/barbershops/${barbershopSlug}/available-times?${params.toString()}`
        );

        const responseData = await response.json();

        if (!response.ok) {
          setAvailableTimes([]);
          setErrorMessage(getApiErrorMessage(responseData));
          return;
        }

        setAvailableTimes(responseData);
      } catch (error) {
        console.error("Erro ao carregar horários disponíveis:", error);
        setAvailableTimes([]);
        setErrorMessage(
          "Não foi possível carregar os horários disponíveis."
        );
      } finally {
        setLoadingTimes(false);
      }
    }

    loadAvailableTimes();
  }, [
    barbershopSlug,
    formData.serviceId,
    formData.professionalId,
    formData.date,
  ]);

  const selectedService = services.find(
    (service) => service.id === Number(formData.serviceId)
  );

  const selectedProfessional = professionals.find(
    (professional) => professional.id === Number(formData.professionalId)
  );

  function getApiErrorMessage(data: ApiErrorResponse) {
    if (typeof data.detail === "string") {
      return data.detail;
    }

    if (Array.isArray(data.detail)) {
      return data.detail[0]?.msg || "Não foi possível realizar o agendamento.";
    }

    return "Não foi possível realizar o agendamento.";
  }

  function formatPhoneInput(value: string) {
    const onlyNumbers = value.replace(/\D/g, "").slice(0, 11);

    if (onlyNumbers.length <= 2) {
      return onlyNumbers;
    }

    if (onlyNumbers.length <= 7) {
      return `(${onlyNumbers.slice(0, 2)}) ${onlyNumbers.slice(2)}`;
    }

    return `(${onlyNumbers.slice(0, 2)}) ${onlyNumbers.slice(
      2,
      7
    )}-${onlyNumbers.slice(7)}`;
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setFormData((previousData) => {
      const shouldResetTime =
        name === "serviceId" ||
        name === "professionalId" ||
        name === "date";

      return {
        ...previousData,
        [name]: name === "clientPhone" ? formatPhoneInput(value) : value,
        time: shouldResetTime ? "" : previousData.time,
      };
    });

    setConfirmed(false);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleTimeSelect(time: string) {
    setFormData((previousData) => ({
      ...previousData,
      time,
    }));

    setConfirmed(false);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setConfirmed(false);

    if (
      !formData.clientName ||
      !formData.clientPhone ||
      !formData.serviceId ||
      !formData.professionalId ||
      !formData.date ||
      !formData.time
    ) {
      setErrorMessage("Preencha todos os campos antes de confirmar.");
      return;
    }

    const phoneNumbers = formData.clientPhone.replace(/\D/g, "");

    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      setErrorMessage("Informe um WhatsApp válido com DDD.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/barbershops/${barbershopSlug}/appointments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientName: formData.clientName,
            clientPhone: formData.clientPhone,
            serviceId: Number(formData.serviceId),
            professionalId: Number(formData.professionalId),
            date: formData.date,
            time: formData.time,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(responseData));
        return;
      }

      setConfirmed(true);
      setSuccessMessage("Agendamento criado com sucesso!");

      setFormData({
        clientName: "",
        clientPhone: "",
        serviceId: "",
        professionalId: "",
        date: "",
        time: "",
      });

      setAvailableTimes([]);
    } catch (error) {
      console.error("Erro ao enviar agendamento:", error);

      setErrorMessage(
        "Não foi possível conectar com o servidor. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  const primaryColor = barbershop?.primaryColor || "#ffffff";
  const secondaryColor = barbershop?.secondaryColor || "#000000";

  return (
    <main
      className="min-h-screen text-white pt-28 px-6"
      style={{
        backgroundColor: secondaryColor,
      }}
    >
      <section className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-zinc-400 uppercase tracking-widest">
            Agendamento
          </span>

          <h1 className="text-4xl font-bold mt-3">
            {barbershop?.welcomeText || "Agende seu horário"}
          </h1>

          <p className="text-zinc-400 mt-4">
            {barbershop?.description ||
              "Escolha o serviço, o profissional, a data e veja os horários disponíveis."}
          </p>

          <p className="text-zinc-500 mt-2 text-sm">
            Barbearia: {barbershop?.name || barbershopSlug}
          </p>

          {(barbershop?.address ||
            barbershop?.instagram ||
            barbershop?.whatsapp) && (
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-zinc-400">
              {barbershop.address && <span>{barbershop.address}</span>}
              {barbershop.instagram && <span>{barbershop.instagram}</span>}
              {barbershop.whatsapp && <span>{barbershop.whatsapp}</span>}
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="max-w-3xl mx-auto mb-8 bg-red-500/10 border border-red-500 text-red-400 rounded-xl p-4 text-center">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="max-w-3xl mx-auto mb-8 bg-green-500/10 border border-green-500 text-green-400 rounded-xl p-4 text-center">
            {successMessage}
          </div>
        )}

        {loadingData ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400">
            Carregando dados da barbearia...
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            <form
              onSubmit={handleSubmit}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 grid gap-6"
            >
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Nome completo
                </label>

                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  placeholder="Digite seu nome completo"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">
                  WhatsApp
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">
                  Serviço
                </label>

                <select
                  name="serviceId"
                  value={formData.serviceId}
                  onChange={handleChange}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 outline-none focus:border-white"
                >
                  <option value="">Selecione um serviço</option>

                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - R$ {service.price} - {service.durationMinutes || 30} min
                    </option>
                  ))}
                </select>

                {services.length === 0 && (
                  <p className="text-sm text-zinc-500 mt-2">
                    Nenhum serviço cadastrado nesta barbearia.
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">
                  Profissional
                </label>

                <select
                  name="professionalId"
                  value={formData.professionalId}
                  onChange={handleChange}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 outline-none focus:border-white"
                >
                  <option value="">Selecione um profissional</option>

                  {professionals.map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.name} - {professional.specialty}
                    </option>
                  ))}
                </select>

                {professionals.length === 0 && (
                  <p className="text-sm text-zinc-500 mt-2">
                    Nenhum profissional cadastrado nesta barbearia.
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">
                  Data
                </label>

                <input
                  type="date"
                  name="date"
                  min={today}
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">
                  Horário disponível
                </label>

                {!formData.serviceId || !formData.professionalId || !formData.date ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-500">
                    Selecione serviço, profissional e data para ver os horários.
                  </div>
                ) : loadingTimes ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-500">
                    Carregando horários disponíveis...
                  </div>
                ) : availableTimes.length === 0 ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-500">
                    Nenhum horário disponível para essa combinação.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {availableTimes.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => handleTimeSelect(time)}
                        style={
                          formData.time === time
                            ? {
                                backgroundColor: primaryColor,
                                borderColor: primaryColor,
                              }
                            : undefined
                        }
                        className={`py-3 rounded-lg border font-semibold transition cursor-pointer ${
                          formData.time === time
                            ? "text-black"
                            : "bg-zinc-900 text-white border-zinc-800 hover:border-white"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}

                {formData.time && (
                  <p className="text-sm text-green-400 mt-3">
                    Horário selecionado: {formData.time}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  services.length === 0 ||
                  professionals.length === 0 ||
                  !formData.time
                }
                style={{
                  backgroundColor: primaryColor,
                }}
                className="text-black py-4 rounded-lg font-semibold hover:scale-[1.02] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "AGENDANDO..." : "CONFIRMAR AGENDAMENTO"}
              </button>
            </form>

            <aside className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 h-fit">
              <h2 className="text-2xl font-bold mb-6">
                Resumo do agendamento
              </h2>

              <div className="space-y-4 text-zinc-300">
                <p>
                  <span className="text-white font-semibold">Cliente:</span>{" "}
                  {formData.clientName || "Não informado"}
                </p>

                <p>
                  <span className="text-white font-semibold">WhatsApp:</span>{" "}
                  {formData.clientPhone || "Não informado"}
                </p>

                <p>
                  <span className="text-white font-semibold">Serviço:</span>{" "}
                  {selectedService
                    ? `${selectedService.name} (${selectedService.durationMinutes || 30} min)`
                    : "Não selecionado"}
                </p>

                <p>
                  <span className="text-white font-semibold">
                    Profissional:
                  </span>{" "}
                  {selectedProfessional
                    ? `${selectedProfessional.name} - ${selectedProfessional.specialty}`
                    : "Não selecionado"}
                </p>

                <p>
                  <span className="text-white font-semibold">Data:</span>{" "}
                  {formData.date || "Não selecionada"}
                </p>

                <p>
                  <span className="text-white font-semibold">Horário:</span>{" "}
                  {formData.time || "Não selecionado"}
                </p>

                <p className="text-2xl font-bold text-white pt-4 border-t border-zinc-800">
                  Total:{" "}
                  {selectedService ? `R$ ${selectedService.price}` : "R$ 0"}
                </p>
              </div>

              {confirmed && (
                <div className="mt-6 bg-green-500/10 border border-green-500 text-green-400 rounded-lg p-4">
                  Agendamento criado com sucesso.
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
