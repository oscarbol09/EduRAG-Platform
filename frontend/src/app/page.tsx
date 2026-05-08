import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            EduRAG
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Plataforma SaaS educativa donde los docentes crean agentes
            conversacionales basados en sus propios documentos
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <FeatureCard
            title="Para Docentes"
            description="Crea chatbots educativos subiendo tus PDFs y documentos. Configura el tono, nivel de restricción y personaliza las respuestas."
            icon="👨‍🏫"
            href="/teacher"
          />
          <FeatureCard
            title="Para Estudiantes"
            description="Accede a un marketplace de chatbots,聊天 con materiales educativos y embebe recursos en tu LMS favorito."
            icon="👨‍🎓"
            href="/marketplace"
          />
          <FeatureCard
            title="Para Administradores"
            description="Gestiona usuarios, configura integraciones y monitorea el uso de la plataforma."
            icon="⚙️"
            href="/admin"
          />
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Comenzar
          </Link>
        </div>

        <section className="mt-24 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Características</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureItem
              title="RAG-powered Responses"
              description="Respuestas basadas en tus documentos educativos"
            />
            <FeatureItem
              title="Multi-LLM Support"
              description="Usa Gemini o Claude según tus necesidades"
            />
            <FeatureItem
              title="Embeddable Chatbots"
              description="Integra chatbots en Moodle u otros LMS"
            />
            <FeatureItem
              title="Multi-tenant Architecture"
              description="Aislamiento total de datos por docente"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  href,
}: {
  title: string;
  description: string;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}
