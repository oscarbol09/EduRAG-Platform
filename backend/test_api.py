from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print("[OK] Health check passed")

def test_chatbots_crud():
    response = client.get("/chatbots")
    assert response.status_code == 200
    print("[OK] GET /chatbots passed")
    
    response = client.post("/chatbots", json={
        "name": "Test Bot",
        "subject_area": "Math",
        "education_level": "university",
        "tone": "friendly",
        "restriction_level": "guided"
    })
    assert response.status_code == 200
    bot_id = response.json()["id"]
    print(f"[OK] POST /chatbots (created: {bot_id})")
    
    response = client.get(f"/chatbots/{bot_id}")
    assert response.status_code == 200
    print(f"[OK] GET /chatbots/{bot_id} passed")
    
    response = client.put(f"/chatbots/{bot_id}", json={
        "name": "Updated Bot",
        "subject_area": "Math",
        "education_level": "university",
        "tone": "friendly",
        "restriction_level": "guided"
    })
    assert response.status_code == 200
    print(f"[OK] PUT /chatbots/{bot_id} passed")
    
    return bot_id

def test_chat(bot_id):
    response = client.post(f"/chat/{bot_id}", json={
        "message": "What is calculus?"
    })
    assert response.status_code == 200
    data = response.json()
    print(f"[OK] POST /chat/{bot_id} passed")
    print(f"  Response: {data['response'][:100]}...")
    return data

def test_auth():
    response = client.get("/auth/me")
    assert response.status_code == 200
    print("[OK] GET /auth/me passed")
    print(f"  User: {response.json()}")

if __name__ == "__main__":
    print("\n=== Testing EduRAG API ===\n")
    test_health()
    test_auth()
    bot_id = test_chatbots_crud()
    test_chat(bot_id)
    print("\n=== All tests passed! ===\n")