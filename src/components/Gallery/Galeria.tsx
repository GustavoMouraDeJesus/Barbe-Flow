import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { API_URL } from "../../services/api";
import type { GalleryImage } from "../../types/GalleryImage";

function getStoredBarbershopSlug() {
  const directSlug = localStorage.getItem("barbershopSlug");

  if (directSlug) {
    return directSlug;
  }

  const storedBarbershop = localStorage.getItem("barbershop");

  if (storedBarbershop) {
    try {
      const barbershop = JSON.parse(storedBarbershop) as {
        slug?: string;
      };

      if (barbershop.slug) {
        return barbershop.slug;
      }
    } catch {
      console.error("Não foi possível ler os dados da barbearia.");
    }
  }

  return "toid";
}

function getImageUrl(imageUrl: string) {
  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/uploads")) {
    return `${API_URL}${imageUrl}`;
  }

  return imageUrl;
}

export default function Gallery() {
  const { slug } = useParams();

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const barbershopSlug = slug || getStoredBarbershopSlug();

  useEffect(() => {
    async function loadGallery() {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `${API_URL}/barbershops/${barbershopSlug}/gallery`
        );

        if (!response.ok) {
          throw new Error("Erro ao carregar galeria.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Resposta inválida do servidor.");
        }

        setImages(data);
      } catch (error) {
        console.error("Erro ao carregar galeria:", error);
        setErrorMessage("Não foi possível carregar a galeria.");
      } finally {
        setLoading(false);
      }
    }

    loadGallery();
  }, [barbershopSlug]);

  return (
    <section
      id="galeria"
      className="py-24 bg-black text-white"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-zinc-400 uppercase tracking-widest">
            Galeria
          </span>

          <h2 className="text-4xl font-bold mt-2">
            Nossos Trabalhos
          </h2>

          <p className="text-zinc-400 mt-4">
            Veja alguns resultados realizados por esta barbearia.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-zinc-400">
            Carregando imagens...
          </p>
        ) : errorMessage ? (
          <p className="text-center text-red-400">
            {errorMessage}
          </p>
        ) : images.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-zinc-400">
              Esta barbearia ainda não adicionou imagens na galeria.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="rounded-xl bg-zinc-950 border border-zinc-800 aspect-[4/3] flex items-center justify-center overflow-hidden"
              >
                <img
                  src={getImageUrl(image.imageUrl)}
                  alt={`Trabalho ${index + 1}`}
                  className="
                    w-full
                    h-full
                    object-contain
                    transition
                    duration-300
                    hover:opacity-90
                  "
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
