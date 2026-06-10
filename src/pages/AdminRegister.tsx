import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { API_URL } from "../services/api";

type RegisterForm = {
  adminName: string;
  barbershopName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterResponse = {
  accessToken: string;
  admin: {
    id: string;
    name: string;
    email: string;
    barbershopId: string;
    barbershopSlug: string;
  };
  barbershop: {
    id: string;
    name: string;
    slug: string;
  };
};

export default function AdminRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterForm>({
    adminName: "",
    barbershopName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !formData.adminName ||
      !formData.barbershopName ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setErrorMessage("Preencha todos os campos.");
      return;
    }

    if (formData.adminName.trim().length < 2) {
      setErrorMessage("Informe o nome completo do responsável.");
      return;
    }

    if (formData.barbershopName.trim().length < 2) {
      setErrorMessage("Informe o nome da barbearia.");
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("As senhas não são iguais.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminName: formData.adminName.trim(),
          barbershopName: formData.barbershopName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (Array.isArray(data.detail)) {
          const validationErrors = data.detail
            .map((error: { msg?: string }) => error.msg)
            .filter(Boolean)
            .join(" ");

          setErrorMessage(
            validationErrors || "Não foi possível concluir o cadastro."
          );
        } else {
          setErrorMessage(
            data.detail || "Não foi possível concluir o cadastro."
          );
        }

        return;
      }

      const registerData = data as RegisterResponse;

      localStorage.setItem("accessToken", registerData.accessToken);
      localStorage.setItem("admin", JSON.stringify(registerData.admin));
      localStorage.setItem(
        "barbershop",
        JSON.stringify(registerData.barbershop)
      );

      localStorage.setItem(
        "barbershopId",
        registerData.admin.barbershopId
      );

      localStorage.setItem(
        "barbershopSlug",
        registerData.barbershop.slug
      );

      navigate("/admin", { replace: true });
    } catch (error) {
      console.error("Erro ao cadastrar barbearia:", error);

      setErrorMessage("Não foi possível conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12 flex items-center justify-center">
      <section className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-zinc-400 uppercase tracking-widest">
            Área administrativa
          </span>

          <h1 className="text-4xl font-bold mt-3">
            Cadastre sua barbearia
          </h1>

          <p className="text-zinc-400 mt-3">
            Crie sua conta para começar a gerenciar serviços, profissionais e
            agendamentos.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 grid gap-6"
        >
          <div>
            <label
              htmlFor="adminName"
              className="block mb-2 text-sm font-medium"
            >
              Nome do responsável
            </label>

            <input
              id="adminName"
              type="text"
              name="adminName"
              value={formData.adminName}
              onChange={handleChange}
              placeholder="Digite seu nome completo"
              autoComplete="name"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label
              htmlFor="barbershopName"
              className="block mb-2 text-sm font-medium"
            >
              Nome da barbearia
            </label>

            <input
              id="barbershopName"
              type="text"
              name="barbershopName"
              value={formData.barbershopName}
              onChange={handleChange}
              placeholder="Exemplo: Barbearia Corte Fino"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block mb-2 text-sm font-medium"
            >
              E-mail
            </label>

            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seuemail@exemplo.com"
              autoComplete="email"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block mb-2 text-sm font-medium"
            >
              Senha
            </label>

            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo de 6 caracteres"
              autoComplete="new-password"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block mb-2 text-sm font-medium"
            >
              Confirmar senha
            </label>

            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Digite novamente sua senha"
              autoComplete="new-password"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 outline-none focus:border-white"
            />
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-lg p-4">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-white text-black py-4 rounded-lg font-semibold hover:scale-[1.02] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "CADASTRANDO..." : "CADASTRAR BARBEARIA"}
          </button>

          <p className="text-center text-zinc-400">
            Já possui uma conta?{" "}
            <Link
              to="/admin/login"
              className="text-white font-semibold hover:underline"
            >
              Entrar
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}