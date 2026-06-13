import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import AdminHeader from "../components/AdminHeader";
import { API_URL } from "../services/api";
import type { GalleryImage } from "../types/GalleryImage";

function getImageUrl(imageUrl: string) {
  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/uploads")) {
    return `${API_URL}${imageUrl}`;
  }

  return imageUrl;
}

export default function AdminGaleria() {
  const navigate = useNavigate();

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

    loadImages();
  }, []);

  function getAccessToken() {
    return localStorage.getItem("accessToken");
  }

  async function loadImages() {
    const accessToken = getAccessToken();

    if (!accessToken) {
      navigate("/admin/login");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(`${API_URL}/admin/gallery`, {
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
        throw new Error("Erro ao carregar imagens.");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Resposta inválida do servidor.");
      }

      setImages(data);
    } catch (error) {
      console.error("Erro ao carregar imagens:", error);
      setErrorMessage("Não foi possível carregar a galeria.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!validTypes.includes(file.type)) {
      setErrorMessage("Envie uma imagem JPG, PNG ou WEBP.");
      setSelectedFile(null);
      return;
    }

    const maxSizeInBytes = 5 * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setErrorMessage("A imagem deve ter no máximo 5MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
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

    if (!selectedFile) {
      setErrorMessage("Selecione uma imagem para adicionar.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await fetch(`${API_URL}/admin/gallery`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const responseData = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("accessToken");
        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          responseData.detail || "Não foi possível enviar a imagem."
        );

        return;
      }

      setImages((previousImages) => [responseData, ...previousImages]);
      setSelectedFile(null);
      setSuccessMessage("Imagem adicionada com sucesso.");
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      setErrorMessage("Não foi possível conectar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteImage(imageId: number) {
    const confirmDelete = window.confirm(
      "Tem certeza que deseja excluir esta imagem da galeria?"
    );

    if (!confirmDelete) {
      return;
    }

    const accessToken = getAccessToken();

    if (!accessToken) {
      navigate("/admin/login");
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(`${API_URL}/admin/gallery/${imageId}`, {
        method: "DELETE",
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
        const responseData = await response.json();

        setErrorMessage(
          responseData.detail || "Não foi possível excluir a imagem."
        );

        return;
      }

      setImages((previousImages) =>
        previousImages.filter((image) => image.id !== imageId)
      );

      setSuccessMessage("Imagem removida com sucesso.");
    } catch (error) {
      console.error("Erro ao excluir imagem:", error);
      setErrorMessage("Não foi possível conectar com o servidor.");
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
                Galeria da Barbearia
              </h1>

              <p className="text-zinc-400 mt-3">
                Adicione imagens dos serviços para os clientes visualizarem.
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

          <form
            onSubmit={handleSubmit}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 mb-10"
          >
            <h2 className="text-2xl font-bold mb-5">
              Adicionar nova imagem
            </h2>

            <div className="grid md:grid-cols-[1fr_auto] gap-4">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="bg-black border border-zinc-800 rounded-lg px-4 py-3 text-zinc-300 file:bg-white file:text-black file:border-0 file:px-4 file:py-2 file:rounded-lg file:font-semibold file:cursor-pointer"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:scale-105 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Enviando..." : "Adicionar imagem"}
              </button>
            </div>

            <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-300 text-sm font-semibold">
                Recomendação para evitar problemas:
              </p>

              <p className="text-zinc-500 text-sm mt-2">
                Use imagens em JPG, PNG ou WEBP, com até 5MB. O ideal é usar imagens
                horizontais ou quadradas, como 1200x900, 1600x1200 ou 1080x1080.
              </p>

              <p className="text-zinc-500 text-sm mt-2">
                O sistema foi ajustado para não cortar a imagem. Se a foto for muito
                vertical ou muito larga, ela será exibida inteira e poderá sobrar espaço
                escuro nas laterais ou em cima/baixo.
              </p>
            </div>
          </form>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-2xl font-bold">
                Imagens cadastradas
              </h2>

              <p className="text-zinc-400 mt-2">
                Essas imagens aparecem na galeria pública da barbearia.
              </p>
            </div>

            {loading ? (
              <p className="p-6 text-zinc-400">
                Carregando imagens...
              </p>
            ) : images.length === 0 ? (
              <p className="p-6 text-zinc-400">
                Nenhuma imagem cadastrada ainda.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="bg-black border border-zinc-800 rounded-xl overflow-hidden"
                  >
                    <div className="aspect-[4/3] bg-zinc-950 flex items-center justify-center overflow-hidden">
                      <img
                        src={getImageUrl(image.imageUrl)}
                        alt="Imagem da galeria"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="p-4">
                      <p className="text-zinc-500 text-sm truncate">
                        {image.originalFilename || "Imagem da galeria"}
                      </p>

                      <button
                        type="button"
                        onClick={() => handleDeleteImage(image.id)}
                        className="mt-4 w-full bg-red-500/10 text-red-400 border border-red-500 px-4 py-3 rounded-lg font-semibold hover:bg-red-500 hover:text-black transition cursor-pointer"
                      >
                        Excluir imagem
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
