"""
AI Doctor Agent — Server troubleshooting assistant powered by DeepSeek.
Uses tool-use pattern: AI decides diagnostic commands → SSH executor runs them → AI interprets.
"""

import os
import json
import logging
import httpx
from typing import List, Dict, Optional
from ssh_executor import classify_command, execute_command

logger = logging.getLogger("ai_doctor.agent")

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

SYSTEM_PROMPT = """You are the **TemcoServers AI Doctor**, an expert Linux server troubleshooting assistant.

## Your Role
You help TemcoServers customers diagnose and fix issues on their virtual private servers (VPS). The customer may not have sysadmin experience — explain things clearly but concisely.

## Available Tools
You have access to run commands on the customer's server via SSH. Use the `run_command` tool to execute diagnostic or fix commands.

### Command Categories
1. **Read-only** (auto-approved): `df -h`, `free -m`, `docker ps`, `systemctl status <service>`, `journalctl`, `top`, `netstat -tlnp`, `nginx -t`, `cat` config files, `ls`, `du`, `tail` logs, `uptime`, `uname -a`
2. **Fix commands** (require justification): `systemctl restart <service>`, `docker restart <container>`, `docker compose up -d`, `nginx -s reload`, `apt update`
3. **Blocked** (never run): `rm`, `reboot`, `shutdown`, `chmod 777`, `passwd`, package installs, destructive operations

## Rules
- Always start by understanding the customer's issue before running commands.
- Run ONE diagnostic command at a time — don't chain multiple commands blindly.
- After each command output, interpret the results and explain what you found.
- If you identify a fixable issue, explain what you'll do BEFORE running a fix command.
- If you cannot resolve the issue after 5 command attempts, suggest escalating to support.
- Never expose passwords, private keys, or other secrets in your responses.
- Keep responses concise. Use bullet points and code blocks for clarity.
- If the server appears to be unreachable, suggest checking if the server is running in the TemcoServers dashboard.

## Server Context
The customer's server details will be provided in the first system message. Use this context to tailor your troubleshooting."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Execute a command on the customer's server via SSH. Only whitelisted commands are allowed. Read-only commands run automatically. Fix commands require justification.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The exact shell command to execute on the server."
                    },
                    "reason": {
                        "type": "string",
                        "description": "Brief explanation of why this command is needed."
                    }
                },
                "required": ["command", "reason"]
            }
        }
    }
]


async def run_doctor_turn(
    messages: List[Dict],
    server_ip: str,
    server_user: str,
    server_password: str,
    model: str = "deepseek"
) -> Dict:
    """
    Run one turn of the AI Doctor conversation.
    Handles tool calls (SSH command execution) automatically.

    Returns:
        {
            "response": str,           # AI's text response to the customer
            "commands_run": [           # list of commands executed this turn
                {"command": str, "output": str, "exit_code": int, "classification": str}
            ],
            "tokens_used": int,
            "model_used": str,
            "needs_confirmation": None | {"command": str, "reason": str}  # if fix command needs approval
        }
    """
    commands_run = []
    total_tokens = 0
    needs_confirmation = None

    # Build full message list with system prompt
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    # Allow up to 5 tool-call rounds per turn
    for iteration in range(5):
        api_response = await _call_llm(full_messages, model, use_tools=True)
        total_tokens += api_response.get("tokens", 0)

        choice = api_response["choices"][0]
        message = choice["message"]

        # If the model wants to call a tool
        if message.get("tool_calls"):
            # Append assistant message with tool_calls to history
            full_messages.append(message)

            for tool_call in message["tool_calls"]:
                fn = tool_call["function"]
                fn_name = fn["name"]
                try:
                    args = json.loads(fn["arguments"])
                except json.JSONDecodeError:
                    args = {"command": fn["arguments"], "reason": ""}

                if fn_name == "run_command":
                    cmd = args.get("command", "")
                    reason = args.get("reason", "")
                    classification = classify_command(cmd)

                    if classification == "blocked":
                        tool_result = f"⛔ Command blocked by security policy: `{cmd}`\nThis command is not allowed on customer servers."
                        commands_run.append({
                            "command": cmd, "output": tool_result,
                            "exit_code": -1, "classification": "blocked"
                        })
                    elif classification == "fix":
                        # Return to frontend for customer confirmation
                        needs_confirmation = {"command": cmd, "reason": reason}
                        tool_result = f"⚠️ This is a fix command that requires your confirmation: `{cmd}`\nReason: {reason}\n\nPlease confirm to proceed."
                        commands_run.append({
                            "command": cmd, "output": "Awaiting customer confirmation",
                            "exit_code": -2, "classification": "fix"
                        })
                    else:
                        # Read-only — execute immediately
                        output, exit_code, error = execute_command(
                            server_ip, server_user, server_password, cmd
                        )
                        if error:
                            tool_result = f"❌ Error: {error}"
                        else:
                            tool_result = f"Exit code: {exit_code}\n{output}" if output else f"Exit code: {exit_code}\n(no output)"
                        commands_run.append({
                            "command": cmd, "output": output or error or "",
                            "exit_code": exit_code, "classification": "readonly"
                        })

                    # Append tool result
                    full_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": tool_result
                    })

            # If a fix command needs confirmation, break the loop and ask the user
            if needs_confirmation:
                # Get one more response from the AI to explain the fix
                api_response2 = await _call_llm(full_messages, model, use_tools=False)
                total_tokens += api_response2.get("tokens", 0)
                response_text = api_response2["choices"][0]["message"]["content"]
                return {
                    "response": response_text,
                    "commands_run": commands_run,
                    "tokens_used": total_tokens,
                    "model_used": model,
                    "needs_confirmation": needs_confirmation
                }

            # Continue loop — AI may want to run another command
            continue

        else:
            # No tool call — AI is done, return its text response
            response_text = message.get("content", "")
            return {
                "response": response_text,
                "commands_run": commands_run,
                "tokens_used": total_tokens,
                "model_used": model,
                "needs_confirmation": None
            }

    # Exhausted iterations
    return {
        "response": "I've run several diagnostics. Let me summarize what I've found so far. If the issue persists, please contact TemcoServers support.",
        "commands_run": commands_run,
        "tokens_used": total_tokens,
        "model_used": model,
        "needs_confirmation": None
    }


async def execute_confirmed_fix(
    messages: List[Dict],
    command: str,
    server_ip: str,
    server_user: str,
    server_password: str,
    model: str = "deepseek"
) -> Dict:
    """
    Execute a previously confirmed fix command and get AI's interpretation.
    Called after customer approves a fix command.
    """
    output, exit_code, error = execute_command(
        server_ip, server_user, server_password, command
    )

    cmd_result = {
        "command": command,
        "output": output or error or "",
        "exit_code": exit_code,
        "classification": "fix"
    }

    # Add the execution result to the conversation
    result_text = f"Fix command executed: `{command}`\nExit code: {exit_code}\n{output or error or '(no output)'}"
    messages_with_result = [{"role": "system", "content": SYSTEM_PROMPT}] + messages + [
        {"role": "user", "content": f"I approved the fix. Here's the result:\n\n```\n{result_text}\n```\n\nPlease interpret the result and tell me if the issue is resolved."}
    ]

    api_response = await _call_llm(messages_with_result, model, use_tools=True)
    tokens = api_response.get("tokens", 0)

    choice = api_response["choices"][0]
    response_text = choice["message"].get("content", "Fix command executed.")

    return {
        "response": response_text,
        "commands_run": [cmd_result],
        "tokens_used": tokens,
        "model_used": model,
        "needs_confirmation": None
    }


async def _call_llm(messages: List[Dict], model: str, use_tools: bool = True) -> Dict:
    """Call DeepSeek or OpenAI API with automatic fallback."""
    if model == "deepseek" and DEEPSEEK_API_KEY:
        result = await _call_deepseek_api(messages, use_tools)
        # Fallback to OpenAI if DeepSeek failed (e.g., 402 insufficient balance)
        if _is_error_response(result) and OPENAI_API_KEY:
            logger.warning("DeepSeek failed, falling back to OpenAI")
            return await _call_openai_api(messages, use_tools)
        return result
    elif OPENAI_API_KEY:
        return await _call_openai_api(messages, use_tools)
    elif DEEPSEEK_API_KEY:
        return await _call_deepseek_api(messages, use_tools)
    else:
        return {
            "choices": [{"message": {"content": "No AI API key configured. Please contact TemcoServers support."}}],
            "tokens": 0
        }


def _is_error_response(result: Dict) -> bool:
    """Check if an LLM response is an error placeholder (not a real AI response)."""
    if result.get("tokens", 0) == 0:
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        if "AI service temporarily unavailable" in content:
            return True
    return False


async def _call_deepseek_api(messages: List[Dict], use_tools: bool) -> Dict:
    """Call DeepSeek chat API with optional tool-use."""
    payload = {
        "model": "deepseek-chat",
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 2048,
    }
    if use_tools:
        payload["tools"] = TOOLS
        payload["tool_choice"] = "auto"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=60.0
        )

    if response.status_code != 200:
        logger.error(f"DeepSeek API error: {response.status_code} {response.text}")
        return {
            "choices": [{"message": {"content": f"AI service temporarily unavailable (error {response.status_code}). Please try again."}}],
            "tokens": 0
        }

    data = response.json()
    data["tokens"] = data.get("usage", {}).get("total_tokens", 0)
    return data


async def _call_openai_api(messages: List[Dict], use_tools: bool) -> Dict:
    """Call OpenAI chat API with optional tool-use."""
    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 2048,
    }
    if use_tools:
        payload["tools"] = TOOLS
        payload["tool_choice"] = "auto"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=60.0
        )

    if response.status_code != 200:
        logger.error(f"OpenAI API error: {response.status_code} {response.text}")
        return {
            "choices": [{"message": {"content": f"AI service temporarily unavailable (error {response.status_code}). Please try again."}}],
            "tokens": 0
        }

    data = response.json()
    data["tokens"] = data.get("usage", {}).get("total_tokens", 0)
    return data
