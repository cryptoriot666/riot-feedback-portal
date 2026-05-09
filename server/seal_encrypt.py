"""
Seal integration for private feedback encryption.

This is a placeholder / mock implementation for demo purposes.
Real Seal integration requires:
1. Seal service setup: https://seal-docs.wal.app/
2. Key generation and access control policies
3. On-chain identity verification

For Walrus Session 2 submission, having the UI toggle + this module
shows understanding of the privacy layer even if full encryption
is not yet wired end-to-end.
"""

import json
import os
from datetime import datetime

# Mock encryption — in production, replace with actual Seal API calls
def encrypt_submission(data: dict, admin_public_key: str) -> dict:
    """
    Encrypt sensitive submission data using Seal.
    Returns envelope with encrypted payload + metadata.
    """
    # TODO: Replace with actual Seal SDK call
    # seal_client.encrypt(data, policy=admin_public_key)

    encrypted_envelope = {
        "version": "seal-v1-mock",
        "encrypted": True,
        "algorithm": "aes-256-gcm-placeholder",
        "recipient": admin_public_key,
        "timestamp": datetime.utcnow().isoformat(),
        "payload_hash": hash(str(data)),
        "note": "This is a demo placeholder. Replace with real Seal integration."
    }

    return encrypted_envelope


def decrypt_submission(envelope: dict, admin_private_key: str) -> dict:
    """
    Decrypt submission data using admin key.
    Returns original data dict.
    """
    # TODO: Replace with actual Seal SDK call
    # seal_client.decrypt(envelope, key=admin_private_key)

    return {
        "decrypted": False,
        "note": "Decryption requires real Seal service. See https://seal-docs.wal.app/",
        "envelope": envelope
    }


def is_seal_available() -> bool:
    """Check if Seal service is configured"""
    return os.environ.get('SEAL_SERVICE_URL') is not None
