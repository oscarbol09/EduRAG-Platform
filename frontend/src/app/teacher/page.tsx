"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Chatbot, Document } from "@/lib/types";

export default function TeacherDashboard() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadChatbots();
  }, []);

  const loadChatbots = async () => {
    try {
      const list = await api.chatbots.list();
      setChatbots(list);
    } catch (error) {
      console.error("Error loading chatbots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChatbot = async (id: string) => {
    if (!confirm("¿Eliminar este chatbot?")) return;
    try {
      await api.chatbots.delete(id);
      setChatbots((prev) => prev.filter((cb) => cb.id !== id));
    } catch (error) {
      console.error("Error deleting chatbot:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              EduRAG
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/teacher/chatbots/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                + Nuevo Chatbot
              </Link>
              <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Panel del Docente</h1>
          <p className="text-gray-600">Gestiona tus chatbots educativos</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : chatbots.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold mb-2">No tienes chatbots</h2>
            <p className="text-gray-600 mb-6">Crea tu primer chatbot educativo</p>
            <Link href="/teacher/chatbots/new" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Crear chatbot
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <div key={chatbot.id} className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{chatbot.name}</h3>
                    <span className="text-sm text-gray-500">{chatbot.subject_area}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${chatbot.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {chatbot.is_published ? "Publicado" : "Borrador"}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>Nivel: {chatbot.education_level === "secondary" ? "Secundaria" : "Universidad"}</p>
                  <p>Tono: {chatbot.tone}</p>
                  <p>Restricción: {chatbot.restriction_level}</p>
                </div>

                <div className="flex gap-2">
                  <Link href={`/teacher/chatbots/${chatbot.id}`} className="flex-1 text-center px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">
                    Editar
                  </Link>
                  <Link href={`/chat/${chatbot.id}`} className="flex-1 text-center px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                    Probar
                  </Link>
                  <button onClick={() => handleDeleteChatbot(chatbot.id)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
