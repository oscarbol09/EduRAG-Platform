from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Azure Cosmos DB
    COSMOS_DB_ENDPOINT: str = ""
    COSMOS_DB_KEY: str = ""
    COSMOS_DB_DATABASE: str = "edubot"

    # Azure Blob Storage
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER_NAME: str = "documents"

    # Azure Queue
    AZURE_QUEUE_CONNECTION_STRING: str = ""
    AZURE_QUEUE_NAME: str = "document-processing"

    # Google Gemini
    GOOGLE_API_KEY: str = ""

    # ChromaDB
    CHROMA_DB_PATH: str = "./chroma_data"

    # RAG Settings
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    RETRIEVAL_TOP_K: int = 5

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
