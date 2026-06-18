import jwt
from datetime import datetime, timedelta

SECRET_KEY = "stgc-Auth-2026-v1-xK9mPqRz2wL7nBv4Jd8Sf3Gh5Tq1Wx0Zy"

payload = {
    "sub": "test-usuario-123",
    "role": "PRODUCTOR",
    "exp": datetime.utcnow() + timedelta(hours=1)
}

token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
print(f"TOKEN: {token}")
