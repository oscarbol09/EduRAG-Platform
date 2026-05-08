"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Chatbot, CreateChatbotData } from "@/lib/types";

export default function NewChatbotPage() {
  const [formData, setFormData] = useState<CreateChatbotData>({
    name: "",
    subject_area: "",
    education_level: "secondary",
    tone: "friendly",
    restriction_level: "guided",
    llm_provider: "gemini",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const chatbot = await api.chatbots.create(formData);
      router.push(`/teacher/chatbots/${chatbot.id}`);
    } catch (error) {
      console.error("Error creating chatbot:", error);
      alert("Error al crear el chatbot");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <Link href="/teacher" className="text-gray-600 hover:text-gray-900">
              ← Volver
            </Link>
            <span className="ml-4 text-xl font-semibold">Nuevo Chatbot</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-8 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del chatbot *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Tutor de Matemáticas"
              required
            />
          </div>

          <div>
            <label htmlFor="subject_area" className="block text-sm font-medium text-gray-700 mb-1">
              Área temática *
            </label>
            <input
              id="subject_area"
              name="subject_area"
              type="text"
              value={formData.subject_area}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Cálculo Diferencial"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="education_level" className="block text-sm font-medium text-gray-700 mb-1">
                Nivel educativo
              </label>
              <select
                id="education_level"
                name="education_level"
                value={formData.education_level}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="secondary">Secundaria</option>
                <option value="university">Universidad</option>
              </select>
            </div>

            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
                Tono de comunicación
              </label>
              <select
                id="tone"
                name="tone"
                value={formData.tone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="formal">Formal</option>
                <option value="friendly">Amigable</option>
                <option value="technical">Técnico</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="restriction_level" className="block text-sm font-medium text-gray-700 mb-1">
                Nivel de restricción
              </label>
              <select
                id="restriction_level"
                name="restriction_level"
                value={formData.restriction_level}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="strict">Estricto (solo contexto)</option>
                <option value="guided">Guiado</option>
                <option value="open">Abierto</option>
              </select>
            </div>

            <div>
              <label htmlFor="llm_provider" className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor LLM
              </label>
              <select
                id="llm_provider"
                name="llm_provider"
                value={formData.llm_provider}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="gemini">Gemini (gratuito)</option>
                <option value="claude">Claude (próximamente)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="welcome_message" className="block text-sm font-medium text-gray-700 mb-1">
              Mensaje de bienvenida (opcional)
            </label>
            <textarea
              id="welcome_message"
              name="welcome_message"
              value={formData.welcome_message || ""}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Hola! Soy tu tutor de..."
            />
          </div>

          <div>
            <label htmlFor="system_prompt_override" className="block text-sm font-medium text-gray-700 mb-1">
              Instrucciones personalizadas (opcional)
            </label>
            <textarea
              id="system_prompt_override"
              name="system_prompt_override"
              value={formData.system_prompt_override || ""}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Instrucciones adicionales para el chatbot..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creando..." : "Crear Chatbot"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
