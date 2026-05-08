from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import msal
from settings import settings

security = HTTPBearer(auto_error=False)

msal_app = None

def get_msal_app():
    global msal_app
    if msal_app is None and settings.ENTRA_CLIENT_ID and settings.ENTRA_TENANT_ID:
        msal_app = msal.ConfidentialClientApplication(
            client_id=settings.ENTRA_CLIENT_ID,
            client_credential=settings.ENTRA_CLIENT_SECRET,
            authority=settings.ENTRA_AUTHORITY or f"https://login.microsoftonline.com/{settings.ENTRA_TENANT_ID}"
        )
    return msal_app


def verify_token(token: str) -> dict:
    msal_client = get_msal_app()
    if not msal_client:
        return {"sub": "demo-user", "email": "demo@example.com", "role": "teacher"}
    
    try:
        result = msal_client.acquire_tokenSilent(
            scopes=[f"api://{settings.ENTRA_CLIENT_ID}/access_as_user"],
            account=None
        )
        if not result:
            result = msal_client.acquire_token_on_behalf_of(scopes=[f"api://{settings.ENTRA_CLIENT_ID}/access_as_user"], claims_challenge=None)
        
        if "access_token" in result:
            import jwt
            decoded = jwt.decode(result["access_token"], options={"verify_signature": False})
            return decoded
    except Exception:
        pass
    
    return {"sub": "demo-user", "email": "demo@example.com", "role": "teacher"}


async def get_current_user_optional(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"sub": "demo-user", "email": "demo@example.com", "role": "teacher"}
    
    token = auth_header.replace("Bearer ", "")
    return verify_token(token)


async def require_auth(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No se proporcionó token de autenticación")
    
    token = auth_header.replace("Bearer ", "")
    user = verify_token(token)
    
    if not user or user.get("sub") == "demo-user":
        raise HTTPException(status_code=401, detail="Token inválido")
    
    return user