import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import Optional
import os

_client: Optional[chromadb.PersistentClient] = None


def get_chroma_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        from settings import settings
        os.makedirs(settings.CHROMA_DB_PATH, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=settings.CHROMA_DB_PATH,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
    return _client


def get_collection(chatbot_id: str) -> chromadb.Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=f"chatbot_{chatbot_id}",
        metadata={"chatbot_id": chatbot_id}
    )


def add_documents(chatbot_id: str, chunks: list[str], embeddings: list[list[float]], document_id: str):
    collection = get_collection(chatbot_id)
    ids = [f"{document_id}_{i}" for i in range(len(chunks))]
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=ids,
        metadatas=[{"document_id": document_id, "chunk_index": i} for i in range(len(chunks))]
    )


def query_similar(chatbot_id: str, query_embedding: list[float], top_k: int = 5) -> list[dict]:
    collection = get_collection(chatbot_id)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )
    return [
        {
            "content": doc,
            "distance": dist,
            "document_id": results["metadatas"][0][i]["document_id"] if results["metadatas"] else None
        }
        for i, (doc, dist) in enumerate(zip(results["documents"][0], results["distances"][0]))
    ]


def delete_chatbot_vectors(chatbot_id: str):
    client = get_chroma_client()
    try:
        client.delete_collection(name=f"chatbot_{chatbot_id}")
    except Exception:
        pass
