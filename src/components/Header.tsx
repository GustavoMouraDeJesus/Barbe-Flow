import Button from "./ui/Button";

export default function Header() {
    return (
        <header id="inicio" className="min-h-screen bg-[url('/image/barbearia.png')] bg-cover bg-center flex items-center">

            <div className="ml-54 px-6">

                <div className="max-w-2xl">
                    <span className="text-zinc-300 uppercase tracking-widest">Bem-vindo</span>

                    <h1 className="text-6xl font-bold mt-4 leading-tight text-zinc-300">
                        Seu estilo começa aqui.
                    </h1>

                    <p className="text-zinc-300 text-lg mt-6">
                        Cabelos modernos, barba, acabamento e atendimento profissional para elevar sua autoestima. Agende seu horário e experimente a excelência em cuidados masculinos.
                    </p>
                    <Button className="mt-8">
                        AGENDAR HORÁRIO
                    </Button>
                </div>
            </div>
        </header>
    )
}