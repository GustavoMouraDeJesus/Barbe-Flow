import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import AdminHeader from "../components/AdminHeader";
import { API_URL } from "../services/api";
import type { Barbershop } from "../types/Barbershop";

type AppearanceForm = {
  primaryColor: string;
  secondaryColor: string;
  welcomeText: string;
  description: string;
  instagram: string;
  whatsapp: string;
  address: string;
};

export default function AdminAparencia() {
  const navigate = useNavigate();

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);

  const [formData, setFormData] = useState<AppearanceForm>({
    primaryColor: "#ffffff",
    secondaryColor: "#000000",
    welcomeText: "Agende seu horário",
    description:
      "Escolha o serviço, o profissional, a data e veja os horários disponíveis.",
    instagram: "",
    whatsapp: "",
    address: "",
  });

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      navigate("/admin/login");
      return;
    }

    loadAppearance();
  }, []);

  function getAccessToken() {
    return localStorage.getItem("accessToken");
  }

  async function loadAppearance() {
    const accessToken = getAccessToken();

    if (!accessToken) {
      navigate("/admin/login");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(`${API_URL}/admin/appearance`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("accessToken");
        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Erro ao carregar aparência.");
      }

      const data = await response.json();

      setBarbershop(data);

      setFormData({
        primaryColor: data.primaryColor || "#ffffff",
        secondaryColor: data.secondaryColor || "#000000",
        welcomeText: data.welcomeText || "Agende seu horário",
        description:
          data.description ||
          "Escolha o serviço, o profissional, a data e veja os horários disponíveis.",
        instagram: data.instagram || "",
        whatsapp: data.whatsapp || "",
        address: data.address || "",
      });
    } catch (error) {
      console.error("Erro ao carregar aparência:", error);
      setErrorMessage("Não foi possível carregar a aparência da barbearia.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = getAccessToken();

    if (!accessToken) {
      navigate("/admin/login");
      return;
    }

    if (!formData.primaryColor || !formData.secondaryColor) {
      setErrorMessage("Escolha as cores da barbearia.");
      return;
    }

    if (!formData.welcomeText || !formData.description) {
      setErrorMessage("Preencha o título e a descrição da página.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(`${API_URL}/admin/appearance`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          welcomeText: formData.welcomeText,
          description: formData.description,
          instagram: formData.instagram || null,
          whatsapp: formData.whatsapp || null,
          address: formData.address || null,
        }),
      });

      const responseData = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("accessToken");
        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          responseData.detail || "Não foi possível salvar a aparência."
        );

        return;
      }

      setBarbershop(responseData);
      setSuccessMessage("Aparência salva com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar aparência:", error);
      setErrorMessage("Não foi possível conectar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
                Aparência da Barbearia
              </h1>

              <p className="text-zinc-400 mt-3">
                Personalize as cores, textos e informações da página pública.
              </p>
            </div>

            <Link
              to="/admin"
              className="bg-white text-black px-5 py-3 rounded-lg font-semibold hover:scale-105 transition w-fit"
            >
              Voltar ao Dashboard
            </Link>
          </div>

          {errorMessage && (
            <div className="mb-6 bg-red-500/10 border border-red-500 text-red-400 rounded-xl p-4">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-green-500/10 border border-green-500 text-green-400 rounded-xl p-4">
              {successMessage}
            </div>
          )}

          {loading ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-zinc-400">
              Carregando aparência...
            </div>
          ) : (
            <div className="grid lg:grid-cols-[420px_1fr] gap-8">
              <form
                onSubmit={handleSubmit}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 h-fit"
              >
                <h2 className="text-2xl font-bold mb-6">
                  Configurações visuais
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-zinc-400 mb-2">
                      Cor principal
                    </label>

                    <div className="flex gap-3">
                      <input
                        type="color"
                        name="primaryColor"
                        value={formData.primaryColor}
                        onChange={handleChange}
                        className="h-12 w-16 bg-black border border-zinc-800 rounded-lg cursor-pointer"
                      />

                      <input
                        type="text"
                        name="primaryColor"
                        value={formData.primaryColor}
                        onChange={handleChange}
                        className="flex-1 bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-2">
                      Cor de fundo
                    </label>

                    <div className="flex gap-3">
                      <input
                        type="color"
                        name="secondaryColor"
                        value={formData.secondaryColor}
                        onChange={handleChange}
                        className="h-12 w-16 bg-black border border-zinc-800 rounded-lg cursor-pointer"
                      />

                      <input
                        type="text"
                        name="secondaryColor"
                        value={formData.secondaryColor}
                        onChange={handleChange}
                        className="flex-1 bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-2">
                      Título da página pública
                    </label>

                    <input
                      type="text"
                      name="welcomeText"
                      value={formData.welcomeText}
                      onChange={handleChange}
                      placeholder="Ex: Agende seu horário na Barbearia Elite"
                      className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-2">
                      Descrição
                    </label>

                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Texto que aparece abaixo do título"
                      rows={4}
                      className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-2">
                      Instagram
                    </label>

                    <input
                      type="text"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleChange}
                      placeholder="@barbearia"
                      className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-2">
                      WhatsApp da barbearia
                    </label>

                    <input
                      type="text"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      placeholder="11999999999"
                      className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-2">
                      Endereço
                    </label>

                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Rua, número, bairro"
                      className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 w-full bg-white text-black px-5 py-3 rounded-lg font-semibold hover:scale-[1.02] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Salvando..." : "Salvar aparência"}
                </button>
              </form>

              <aside className="rounded-2xl border border-zinc-800 overflow-hidden h-fit">
                <div
                  className="p-8 min-h-[520px]"
                  style={{
                    backgroundColor: formData.secondaryColor,
                  }}
                >
                  <span className="text-zinc-400 uppercase tracking-widest">
                    Prévia da página
                  </span>

                  <h2 className="text-4xl font-bold mt-5">
                    {formData.welcomeText}
                  </h2>

                  <p className="text-zinc-300 mt-4 max-w-xl">
                    {formData.description}
                  </p>

                  <button
                    type="button"
                    className="mt-8 px-6 py-4 rounded-lg font-bold text-black"
                    style={{
                      backgroundColor: formData.primaryColor,
                    }}
                  >
                    Agendar horário
                  </button>

                  <div className="mt-10 bg-black/40 border border-white/10 rounded-2xl p-6">
                    <p className="text-zinc-400">Barbearia</p>
                    <strong className="text-2xl block mt-2">
                      {barbershop?.name}
                    </strong>

                    {formData.address && (
                      <p className="text-zinc-300 mt-4">
                        Endereço: {formData.address}
                      </p>
                    )}

                    {formData.instagram && (
                      <p className="text-zinc-300 mt-2">
                        Instagram: {formData.instagram}
                      </p>
                    )}

                    {formData.whatsapp && (
                      <p className="text-zinc-300 mt-2">
                        WhatsApp: {formData.whatsapp}
                      </p>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
