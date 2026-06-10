import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { API_URL } from "../services/api";

type LoginForm = {
  email: string;
  password: string;
};

type LoginResponse = {
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

export default function AdminLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginForm>({
    email: "",
    password: "",
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

    if (!formData.email || !formData.password) {
      setErrorMessage("Preencha o e-mail e a senha.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.detail || "Não foi possível realizar o login.");
        return;
      }

      const loginData = data as LoginResponse;

      localStorage.setItem("accessToken", loginData.accessToken);
localStorage.setItem("admin", JSON.stringify(loginData.admin));
localStorage.setItem(
  "barbershop",
  JSON.stringify(loginData.barbershop)
);

localStorage.setItem(
  "barbershopId",
  loginData.admin.barbershopId
);

localStorage.setItem(
  "barbershopSlug",
  loginData.admin.barbershopSlug
);

      navigate("/admin");
    } catch (error) {
      console.error("Erro ao realizar login:", error);

      setErrorMessage(
        "Não foi possível conectar com o servidor."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 flex items-center justify-center">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-zinc-400 uppercase tracking-widest">
            Área administrativa
          </span>

          <h1 className="text-4xl font-bold mt-3">
            Login do administrador
          </h1>

          <p className="text-zinc-400 mt-3">
            Entre com seus dados para acessar o painel da barbearia.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 grid gap-6"
        >
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
              placeholder="admin@toid.com"
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
              placeholder="Digite sua senha"
              autoComplete="current-password"
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
            {loading ? "ENTRANDO..." : "ENTRAR"}
          </button>
          <p className="text-center text-zinc-400">
  Não possui uma conta?{" "}
  <Link
    to="/admin/cadastro"
    className="text-white font-semibold hover:underline"
  >
    Cadastre sua barbearia
  </Link>
</p>
        </form>
      </section>
    </main>
  );
}