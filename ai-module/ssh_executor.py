"""
SSH Command Executor for AI Doctor.
Connects to customer servers and runs whitelisted diagnostic/fix commands.
"""

import re
import os
import io
import paramiko
import logging
from typing import Tuple, Optional

logger = logging.getLogger("ai_doctor.ssh")

# SSH private key for key-based auth (optional — used when password auth is disabled)
# Set SSH_PRIVATE_KEY env var with the PEM content, or SSH_KEY_PATH with a file path
SSH_PRIVATE_KEY = os.getenv("SSH_PRIVATE_KEY", "")
SSH_KEY_PATH = os.getenv("SSH_KEY_PATH", "")


def _get_pkey() -> Optional[paramiko.PKey]:
    """Load SSH private key from file path or env var."""
    # Try file path first (most reliable for OpenSSH format keys)
    key_path = SSH_KEY_PATH
    if key_path and os.path.exists(key_path):
        for key_class in [paramiko.Ed25519Key, paramiko.RSAKey, paramiko.ECDSAKey]:
            try:
                return key_class.from_private_key_file(key_path)
            except Exception:
                continue
        logger.warning(f"Failed to load SSH key from file: {key_path}")

    # Try env var (PEM string)
    key_data = SSH_PRIVATE_KEY
    if key_data:
        for key_class in [paramiko.Ed25519Key, paramiko.RSAKey, paramiko.ECDSAKey]:
            try:
                return key_class.from_private_key(io.StringIO(key_data))
            except Exception:
                continue
        logger.warning("Failed to load SSH key from env var")

    return None

# ─── Command Whitelist ───────────────────────────────────────────────────────

# Read-only diagnostic commands — auto-approved
READONLY_PATTERNS = [
    r"^systemctl\s+status\s+[\w\-\.]+$",
    r"^systemctl\s+is-active\s+[\w\-\.]+$",
    r"^systemctl\s+list-units\s+--type=service(\s+--state=\w+)?$",
    r"^journalctl\s+-u\s+[\w\-\.]+\s+--no-pager\s+-n\s+\d{1,3}$",
    r"^journalctl\s+--no-pager\s+-n\s+\d{1,3}$",
    r"^df\s+-h$",
    r"^free\s+-[mhg]$",
    r"^uptime$",
    r"^top\s+-bn1\s+\|\s+head\s+-\d{1,2}$",
    r"^ps\s+aux(\s+\|\s+head\s+-\d{1,3})?$",
    r"^ps\s+aux\s+\|\s+grep\s+[\w\-\.]+$",
    r"^docker\s+ps(\s+-a)?$",
    r"^docker\s+logs\s+[\w\-\.]+\s+--tail\s+\d{1,3}$",
    r"^docker\s+inspect\s+[\w\-\.]+$",
    r"^docker\s+stats\s+--no-stream$",
    r"^docker\s+compose\s+ps$",
    r"^nginx\s+-t$",
    r"^nginx\s+-T$",
    r"^cat\s+/etc/nginx/[\w\-\./]+$",
    r"^cat\s+/etc/systemd/[\w\-\./]+$",
    r"^cat\s+[\w\-\./]*docker-compose[\w\-\.]*\.ya?ml$",
    r"^ls\s+-la?\s+/[\w\-\./]+$",
    r"^du\s+-sh\s+/[\w\-\./]+$",
    r"^tail\s+-n\s+\d{1,3}\s+/var/log/[\w\-\./]+$",
    r"^cat\s+/var/log/[\w\-\./]+\s+\|\s+tail\s+-\d{1,3}$",
    r"^netstat\s+-tlnp$",
    r"^ss\s+-tlnp$",
    r"^uname\s+-a$",
    r"^hostname$",
    r"^whoami$",
    r"^ip\s+addr(\s+show)?$",
    r"^curl\s+-s\s+http://localhost[:/][\w\-\./]*$",
    r"^apt\s+list\s+--installed(\s+\|\s+grep\s+[\w\-]+)?$",
    r"^dpkg\s+-l(\s+\|\s+grep\s+[\w\-]+)?$",
    r"^which\s+[\w\-]+$",
    r"^crontab\s+-l$",
    r"^lsblk$",
    r"^cat\s+/etc/os-release$",
]

# Fix commands — require explicit customer confirmation via the AI flow
FIX_PATTERNS = [
    r"^systemctl\s+restart\s+[\w\-\.]+$",
    r"^systemctl\s+start\s+[\w\-\.]+$",
    r"^systemctl\s+reload\s+[\w\-\.]+$",
    r"^docker\s+restart\s+[\w\-\.]+$",
    r"^docker\s+compose\s+up\s+-d(\s+[\w\-\.]+)?$",
    r"^docker\s+compose\s+restart(\s+[\w\-\.]+)?$",
    r"^nginx\s+-s\s+reload$",
    r"^apt-get\s+update$",
    r"^apt\s+update$",
]

# Absolutely blocked — never execute
BLOCKED_PATTERNS = [
    r"rm\s", r"rmdir\s", r"dd\s", r"mkfs", r"fdisk", r"parted",
    r"shutdown", r"reboot", r"halt", r"poweroff", r"init\s+[06]",
    r"chmod\s+777", r"chown\s+root", r"passwd",
    r"wget\s", r"curl\s.*\|\s*(ba)?sh",
    r">\s*/dev/", r"mv\s+/", r"cp\s+/dev/",
    r":(){ :|:& };:",  # fork bomb
    r"\|\s*(ba)?sh", r"eval\s", r"exec\s",
    r"pip\s+install", r"npm\s+install", r"apt-get\s+install", r"apt\s+install",
    r"useradd", r"userdel", r"groupadd", r"groupdel",
    r"iptables", r"ufw\s",
]


def classify_command(command: str) -> str:
    """
    Classify a command as 'readonly', 'fix', or 'blocked'.
    Returns the classification string.
    """
    cmd = command.strip()

    # Check blocked first (highest priority)
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, cmd):
            return "blocked"

    # Check read-only
    for pattern in READONLY_PATTERNS:
        if re.match(pattern, cmd):
            return "readonly"

    # Check fix
    for pattern in FIX_PATTERNS:
        if re.match(pattern, cmd):
            return "fix"

    # Default: unknown commands are blocked
    return "blocked"


def execute_command(
    host: str,
    username: str,
    password: str,
    command: str,
    port: int = 22,
    timeout: int = 30
) -> Tuple[str, int, Optional[str]]:
    """
    Execute a command on a remote server via SSH.

    Returns:
        (output, exit_code, error_message)
    """
    classification = classify_command(command)
    if classification == "blocked":
        return "", -1, f"Command blocked by security policy: {command}"

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        _ssh_connect(client, host, port, username, password)

        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()

        output = stdout.read().decode("utf-8", errors="replace")
        err_output = stderr.read().decode("utf-8", errors="replace")

        # Truncate output to prevent excessive storage
        MAX_OUTPUT = 10000
        if len(output) > MAX_OUTPUT:
            output = output[:MAX_OUTPUT] + f"\n... (truncated, {len(output)} chars total)"
        if len(err_output) > MAX_OUTPUT:
            err_output = err_output[:MAX_OUTPUT] + f"\n... (truncated)"

        combined = output
        if err_output.strip():
            combined += f"\n[STDERR]\n{err_output}"

        return combined, exit_code, None

    except paramiko.AuthenticationException:
        return "", -1, "SSH authentication failed. Server credentials may have changed."
    except paramiko.SSHException as e:
        return "", -1, f"SSH connection error: {str(e)}"
    except TimeoutError:
        return "", -1, f"Command timed out after {timeout} seconds."
    except Exception as e:
        return "", -1, f"Connection failed: {str(e)}"
    finally:
        client.close()


def _ssh_connect(client: paramiko.SSHClient, host: str, port: int, username: str, password: str):
    """Connect via SSH — tries password first, then private key fallback."""
    try:
        client.connect(
            hostname=host, port=port, username=username, password=password,
            timeout=10, look_for_keys=False, allow_agent=False
        )
    except paramiko.AuthenticationException:
        # Password auth failed — try private key
        pkey = _get_pkey()
        if pkey:
            logger.info(f"Password auth failed for {host}, trying SSH key...")
            client.connect(
                hostname=host, port=port, username=username, pkey=pkey,
                timeout=10, look_for_keys=False, allow_agent=False
            )
        else:
            raise  # No key available, re-raise the original error


def test_connection(host: str, username: str, password: str, port: int = 22) -> Tuple[bool, str]:
    """Test SSH connectivity to a server."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        _ssh_connect(client, host, port, username, password)
        client.close()
        return True, "Connection successful"
    except Exception as e:
        return False, str(e)
