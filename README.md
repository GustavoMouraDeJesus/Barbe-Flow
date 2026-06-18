# 💈 Barbe Flow

Sistema Full-Stack desenvolvido para auxiliar barbearias no gerenciamento de agendamentos, serviços, profissionais, horários de funcionamento, galeria e painel administrativo.

O **Barbe Flow** foi criado com o objetivo de transformar o processo de agendamento em barbearias, oferecendo uma experiência simples para o cliente e uma área administrativa completa para o dono do estabelecimento.

---

## 🚀 Sobre o projeto

Tecnologia também é sobre resolver problemas reais de negócios reais.

O **Barbe Flow** é uma solução pensada para barbearias que desejam organizar seus atendimentos de forma mais prática, moderna e eficiente.

A aplicação permite que clientes realizem agendamentos sem precisar criar conta, escolhendo serviço, profissional, data e horário disponível. Já o administrador possui acesso a um painel completo para gerenciar os principais recursos da barbearia.

---

## 🧠 Funcionalidades

### 👤 Cliente

* Visualização da página principal da barbearia
* Acesso à galeria de imagens
* Escolha de serviço
* Escolha de profissional
* Seleção de data e horário
* Confirmação de agendamento
* Agendamento sem necessidade de login

---

### 🔐 Administrador

* Cadastro e login de administrador
* Cada administrador vinculado a uma barbearia
* Página pública individual por barbearia através de slug
* Gerenciamento de serviços
* Gerenciamento de profissionais
* Configuração de horários de funcionamento
* Gerenciamento da galeria da barbearia
* Personalização da página de agendamento
* Visualização de agendamentos do dia
* Visualização de agendamentos do dia seguinte
* Visualização de agendamentos da semana
* Visualização de agendamentos do mês
* Controle de status dos agendamentos
* Exibição de faturamento diário, semanal e mensal

---

## 📊 Painel administrativo

O painel administrativo foi desenvolvido para facilitar a rotina da barbearia.

Nele, o administrador consegue acompanhar os agendamentos de forma organizada, visualizar métricas importantes e tomar decisões com mais clareza.

### Recursos do painel:

* Total de agendamentos
* Agendamentos por período
* Faturamento do dia
* Faturamento da semana
* Faturamento do mês
* Lista de clientes agendados
* Serviços selecionados
* Profissionais responsáveis
* Status do atendimento

---

## 🛠️ Tecnologias utilizadas

### Front-End

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router DOM

### Back-End

* Python
* FastAPI
* SQLite
* SQLAlchemy
* JWT
* Passlib / Bcrypt
* Python-Jose
* Python-Multipart
* Uvicorn
* CORS Middleware

---

## 🗂️ Estrutura do projeto

```bash
barbe-flow/
│
├── backend/
│   ├── uploads/
│   │   └── gallery/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── routes/
│   └── barbershop.db
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🔗 Principais rotas da aplicação

### Rotas públicas

* Página inicial da barbearia
* Página de agendamento
* Galeria
* Listagem de serviços
* Listagem de profissionais

### Rotas administrativas

* Login do administrador
* Cadastro do administrador
* Dashboard administrativo
* Painel do dia
* Serviços
* Profissionais
* Horários de funcionamento
* Aparência da barbearia
* Galeria administrativa

---

## ⚙️ Como executar o projeto

### Pré-requisitos

Antes de começar, é necessário ter instalado:

* Node.js
* Python
* Git

---

## ▶️ Rodando o Back-End

Acesse a pasta do back-end:

```bash
cd backend
```

Crie o ambiente virtual:

```bash
python -m venv venv
```

Ative o ambiente virtual:

```bash
venv\Scripts\activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Execute o servidor:

```bash
uvicorn main:app --reload
```

O servidor será iniciado em:

```bash
http://127.0.0.1:8000
```

A documentação interativa da API estará disponível em:

```bash
http://127.0.0.1:8000/docs
```

---

## ▶️ Rodando o Front-End

Acesse a pasta do front-end:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Execute o projeto:

```bash
npm run dev
```

A aplicação será iniciada em:

```bash
http://localhost:5173
```

---

## 📌 Endpoints principais

### Serviços

```http
GET /services
```

Lista os serviços cadastrados da barbearia.

---

### Profissionais

```http
GET /professionals
```

Lista os profissionais disponíveis.

---

### Agendamentos

```http
POST /appointments
```

Cria um novo agendamento.

Exemplo de envio:

```json
{
  "clientName": "João Silva",
  "serviceId": 1,
  "professionalId": 2,
  "date": "2026-06-18",
  "time": "14:30"
}
```

---

## 🖼️ Screenshots

### Página inicial

```md
Adicione aqui uma imagem da Home
```

### Página de agendamento

```md
Adicione aqui uma imagem da tela de agendamento
```

### Painel administrativo

```md
Adicione aqui uma imagem do painel administrativo
```

### Gerenciamento de serviços

```md
Adicione aqui uma imagem da tela de serviços
```

---

## 💡 Aprendizados

Durante o desenvolvimento do **Barbe Flow**, aprofundei meus conhecimentos em:

* Criação de aplicações Full-Stack
* Integração entre Front-End e Back-End
* Consumo de API REST
* Organização de rotas públicas e privadas
* Modelagem de banco de dados
* Autenticação com JWT
* Upload de imagens
* Estruturação de projetos com React e FastAPI
* Criação de dashboards administrativos
* Desenvolvimento de soluções para problemas reais

---

## 🔮 Melhorias futuras

* Dashboard com gráficos
* Controle avançado de disponibilidade por profissional
* Confirmação automática por WhatsApp
* Envio de lembretes para clientes
* Sistema de avaliação de atendimento
* Página pública personalizada para cada barbearia
* Deploy completo do Front-End e Back-End
* Integração com pagamentos
* Relatórios financeiros mais detalhados

---

## 📍 Status do projeto

🚧 Projeto em desenvolvimento

O **Barbe Flow** já possui estrutura Full-Stack, integração entre front-end e back-end, sistema de agendamentos, painel administrativo e gerenciamento de recursos essenciais da barbearia.

---

## 👨‍💻 Autor

Desenvolvido por **Gustavo Moura de Jesus**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge\&logo=linkedin\&logoColor=white)](https://www.linkedin.com/in/gustavo-moura-861938222/)
[![GitHub](https://img.shields.io/badge/GitHub-000?style=for-the-badge\&logo=github\&logoColor=white)](https://github.com/GustavoMouraDeJesus)
[![Instagram](https://img.shields.io/badge/Instagram-red?style=for-the-badge\&logo=instagram\&logoColor=white)](https://www.instagram.com/gmoura_djesus/)

---

## ⭐ Considerações

O **Barbe Flow** representa um passo importante na minha evolução como desenvolvedor, sendo meu primeiro projeto Full-Stack com foco em resolver um problema real de negócio.

Mais do que apenas uma aplicação, ele foi desenvolvido para simular uma solução que poderia ser utilizada por barbearias reais, unindo organização, praticidade e tecnologia.
