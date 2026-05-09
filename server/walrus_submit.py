import subprocess
import os
import json

def upload_to_walrus(filepath: str, submission_id: str) -> str:
    """
    Upload a file to Walrus via CLI.
    Returns Blob ID if successful, None otherwise.

    Requires: walrus CLI installed and configured
    Install: https://docs.wal.app/docs/walrus-client
    """
    try:
        result = subprocess.run(
            ['walrus', 'store', filepath, '--json'],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            print(f"[Walrus Error] {result.stderr}")
            return None

        # Parse JSON output from walrus CLI
        try:
            output = json.loads(result.stdout)
            # Walrus CLI returns blob ID in various formats depending on version
            # Common keys: 'blobId', 'newlyCreated', 'alreadyCertified'
            if 'newlyCreated' in output and output['newlyCreated']:
                return output['newlyCreated'].get('blobId') or output['newlyCreated'].get('blobObject', {}).get('blobId')
            if 'alreadyCertified' in output and output['alreadyCertified']:
                return output['alreadyCertified'].get('blobId')
            if 'blobId' in output:
                return output['blobId']

            # Fallback: try to extract from stdout text
            stdout_text = result.stdout
            if 'Blob ID:' in stdout_text:
                parts = stdout_text.split('Blob ID:')
                if len(parts) > 1:
                    return parts[1].strip().split()[0]

            return None
        except json.JSONDecodeError:
            # Fallback for non-JSON output
            stdout_text = result.stdout
            if 'Blob ID:' in stdout_text:
                parts = stdout_text.split('Blob ID:')
                if len(parts) > 1:
                    return parts[1].strip().split()[0]
            return None

    except FileNotFoundError:
        print("[Walrus Error] 'walrus' CLI not found. Install: https://docs.wal.app/docs/walrus-client")
        return None
    except subprocess.TimeoutExpired:
        print("[Walrus Error] Upload timed out")
        return None
    except Exception as e:
        print(f"[Walrus Error] {str(e)}")
        return None


def read_from_walrus(blob_id: str, output_path: str) -> bool:
    """
    Download a blob from Walrus via CLI.
    Returns True if successful.
    """
    try:
        result = subprocess.run(
            ['walrus', 'read', blob_id, '--out', output_path],
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.returncode == 0
    except Exception as e:
        print(f"[Walrus Read Error] {str(e)}")
        return False
