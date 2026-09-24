import datetime
from unittest.mock import patch

import jwt
import pytest
from app.firebase_auth import FirebaseTokenError, verify_firebase_id_token
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


def _certificate_and_key():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "firebase-test")])
    now = datetime.datetime.now(datetime.UTC)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + datetime.timedelta(hours=1))
        .sign(key, hashes.SHA256())
    )
    pem = cert.public_bytes(serialization.Encoding.PEM).decode()
    return key, pem


def _token(key, *, project_id="agrobamba-cia-ltda", email="ana@agrobamba.com", verified=True):
    now = datetime.datetime.now(datetime.UTC)
    return jwt.encode(
        {
            "sub": "firebase-uid",
            "email": email,
            "email_verified": verified,
            "aud": project_id,
            "iss": f"https://securetoken.google.com/{project_id}",
            "iat": now,
            "exp": now + datetime.timedelta(minutes=5),
        },
        key,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )


def test_verify_firebase_id_token_accepts_project_audience():
    key, pem = _certificate_and_key()
    token = _token(key)
    with patch("app.firebase_auth._certificates", return_value={"test-kid": pem}):
        claims = verify_firebase_id_token(token)
    assert claims["email"] == "ana@agrobamba.com"


def test_verify_firebase_id_token_rejects_other_project():
    key, pem = _certificate_and_key()
    token = _token(key, project_id="loxadev-afa68")
    with (
        patch("app.firebase_auth._certificates", return_value={"test-kid": pem}),
        pytest.raises(FirebaseTokenError),
    ):
        verify_firebase_id_token(token)
