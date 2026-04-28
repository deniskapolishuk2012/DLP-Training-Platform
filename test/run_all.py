#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║          DLP Training Platform — Unified Launcher v2.0           ║
║                                                                  ║
║  Orchestrates the full FastAPI + Vite dev stack automatically.   ║
║  Usage:                                                          ║
║    python run_all.py                  # Start both services      ║
║    python run_all.py --backend-only   # FastAPI only             ║
║    python run_all.py --frontend-only  # Vite only                ║
╚══════════════════════════════════════════════════════════════════╝

Compatibility: Windows (PowerShell), macOS, Linux
Requirements : Python 3.8+ (no third-party packages needed here)
"""

import argparse
import os
import platform
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────────────────────────────

# Resolve project root relative to this launcher file, so the script
# works correctly no matter which working directory it is invoked from.
ROOT_DIR     = Path(__file__).resolve().parent
BACKEND_DIR  = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
VENV_DIR     = BACKEND_DIR / "venv"

BACKEND_PORT  = 8000
FRONTEND_PORT = 3000

BACKEND_HEALTH_URL  = f"http://127.0.0.1:{BACKEND_PORT}/docs"
FRONTEND_HEALTH_URL = f"http://127.0.0.1:{FRONTEND_PORT}"

# How long to wait (in seconds) for each service to become ready
READINESS_TIMEOUT = 60
READINESS_POLL    = 1.0   # seconds between polls

# How many times to retry finding a free port before giving up
PORT_RETRY_LIMIT = 5

IS_WINDOWS = platform.system() == "Windows"

# ─────────────────────────────────────────────────────────────────
#  ANSI COLOUR HELPERS
#  Works on Windows 10+ (VT100 is enabled by the first print call
#  on modern PowerShell / Windows Terminal). Falls back to plain
#  text on older terminals by checking TERM / NO_COLOR.
# ─────────────────────────────────────────────────────────────────

def _supports_color() -> bool:
    """Return True when the terminal is likely to render ANSI codes."""
    if os.environ.get("NO_COLOR"):
        return False
    if IS_WINDOWS:
        # Windows Terminal and modern PowerShell support VT100.
        # Enable it for the current console session.
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32          # type: ignore[attr-defined]
            kernel32.SetConsoleMode(
                kernel32.GetStdHandle(-11),            # STD_OUTPUT_HANDLE
                0x0001 | 0x0002 | 0x0004,              # ENABLE_PROCESSED_OUTPUT | ENABLE_WRAP_AT_EOL_OUTPUT | ENABLE_VIRTUAL_TERMINAL_PROCESSING
            )
            return True
        except Exception:
            return False
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


_COLOR = _supports_color()

def _c(code: str, text: str) -> str:
    return f"\033[{code}m{text}\033[0m" if _COLOR else text

def _bold(t: str)    -> str: return _c("1",    t)
def _green(t: str)   -> str: return _c("1;32", t)
def _yellow(t: str)  -> str: return _c("1;33", t)
def _red(t: str)     -> str: return _c("1;31", t)
def _cyan(t: str)    -> str: return _c("1;36", t)
def _magenta(t: str) -> str: return _c("1;35", t)
def _dim(t: str)     -> str: return _c("2",    t)

def log_info(msg: str)    -> None: print(f"  {_cyan('→')}  {msg}")
def log_ok(msg: str)      -> None: print(f"  {_green('✔')}  {msg}")
def log_warn(msg: str)    -> None: print(f"  {_yellow('⚠')}  {msg}")
def log_error(msg: str)   -> None: print(f"  {_red('✖')}  {msg}", file=sys.stderr)
def log_section(msg: str) -> None: print(f"\n{_bold(_magenta('▶'))} {_bold(msg)}")
def log_banner()          -> None:
    w = 66
    border = _cyan("═" * w)
    print(f"\n  {border}")
    print(f"  {_cyan('║')}{_bold('  DLP Training Platform — Launcher v2.0'):^{w-2}}{_cyan('║')}")
    print(f"  {border}\n")

# ─────────────────────────────────────────────────────────────────
#  PREREQUISITE CHECKS
# ─────────────────────────────────────────────────────────────────

def _require_python() -> Path:
    """
    Ensure Python 3.8+ is available and return its absolute path.
    On Windows we always use the same interpreter that is running this
    script, which guarantees venv compatibility.
    """
    py = Path(sys.executable)
    if sys.version_info < (3, 8):
        log_error(f"Python 3.8+ is required (found {sys.version}). Please upgrade.")
        sys.exit(1)
    log_ok(f"Python {sys.version.split()[0]}  →  {py}")
    return py


def _require_node() -> Path:
    """Ensure Node.js ≥ 16 is on PATH and return the resolved path."""
    node_bin = "node.exe" if IS_WINDOWS else "node"
    node_path = shutil.which(node_bin) or shutil.which("node")
    if not node_path:
        log_error(
            "Node.js was not found on PATH.\n"
            "     Install it from https://nodejs.org (LTS recommended) and try again."
        )
        sys.exit(1)

    try:
        result = subprocess.run(
            [node_path, "--version"],
            capture_output=True, text=True, timeout=10,
        )
        version_str = result.stdout.strip().lstrip("v")
        major = int(version_str.split(".")[0])
        if major < 16:
            log_error(
                f"Node.js 16+ is required (found v{version_str}). "
                "Please upgrade at https://nodejs.org"
            )
            sys.exit(1)
        log_ok(f"Node.js v{version_str}  →  {node_path}")
        return Path(node_path)
    except Exception as exc:
        log_error(f"Could not determine Node.js version: {exc}")
        sys.exit(1)


def _require_npm() -> Path:
    """Ensure npm is on PATH and return its resolved path."""
    npm_bin = "npm.cmd" if IS_WINDOWS else "npm"
    npm_path = shutil.which(npm_bin) or shutil.which("npm")
    if not npm_path:
        log_error(
            "npm was not found on PATH. "
            "It is bundled with Node.js — re-install Node from https://nodejs.org"
        )
        sys.exit(1)
    log_ok(f"npm  →  {npm_path}")
    return Path(npm_path)


# ─────────────────────────────────────────────────────────────────
#  PORT UTILITIES
# ─────────────────────────────────────────────────────────────────

def _port_is_free(port: int) -> bool:
    """Return True if the TCP port is available for binding."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


def _find_free_port(preferred: int, service_name: str) -> int:
    """
    Return `preferred` if free.  Otherwise scan sequentially up to
    PORT_RETRY_LIMIT times and return the first available port.
    """
    if _port_is_free(preferred):
        return preferred

    log_warn(f"Port {preferred} is already in use — searching for a free port…")
    for offset in range(1, PORT_RETRY_LIMIT + 1):
        candidate = preferred + offset
        if _port_is_free(candidate):
            log_ok(f"{service_name} will use port {candidate} instead.")
            return candidate

    log_error(
        f"Could not find a free port near {preferred} for {service_name}. "
        "Free a port or increase PORT_RETRY_LIMIT."
    )
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────
#  VIRTUAL ENVIRONMENT SETUP
# ─────────────────────────────────────────────────────────────────

def _venv_python(py: Path) -> Path:
    """Return the path to the venv's Python interpreter."""
    if IS_WINDOWS:
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def _venv_pip(py: Path) -> Path:
    """Return the path to the venv's pip executable."""
    if IS_WINDOWS:
        return VENV_DIR / "Scripts" / "pip.exe"
    return VENV_DIR / "bin" / "pip"


def setup_backend_venv(py: Path) -> Path:
    """
    Idempotently create the backend virtualenv and install dependencies.
    Returns the path to the venv Python interpreter.
    """
    log_section("Backend — Python environment")

    venv_py  = _venv_python(py)
    venv_pip = _venv_pip(py)
    req_file = BACKEND_DIR / "requirements.txt"

    # ── Create venv if missing ───────────────────────────────────
    if not venv_py.exists():
        log_info(f"Creating virtual environment at {VENV_DIR} …")
        result = subprocess.run(
            [str(py), "-m", "venv", str(VENV_DIR)],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            log_error("Failed to create virtual environment:\n" + result.stderr)
            sys.exit(1)
        log_ok("Virtual environment created.")
    else:
        log_ok(f"Virtual environment found at {VENV_DIR}")

    # ── Determine whether requirements are already satisfied ─────
    # We compare a fingerprint of requirements.txt against a stamp
    # file inside the venv. On any mismatch we reinstall.
    stamp_file = VENV_DIR / ".requirements_stamp"
    req_content = req_file.read_text(encoding="utf-8")

    needs_install = True
    if stamp_file.exists():
        saved = stamp_file.read_text(encoding="utf-8")
        if saved == req_content:
            needs_install = False

    if needs_install:
        log_info("Installing backend dependencies…")
        result = subprocess.run(
            [str(venv_pip), "install", "-r", str(req_file), "--quiet"],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            log_error(
                "pip install failed. Output:\n"
                + (result.stderr or result.stdout)
            )
            sys.exit(1)
        stamp_file.write_text(req_content, encoding="utf-8")
        log_ok("Backend dependencies installed.")
    else:
        log_ok("Backend dependencies already up-to-date — skipping reinstall.")

    return venv_py


# ─────────────────────────────────────────────────────────────────
#  FRONTEND DEPENDENCY SETUP
# ─────────────────────────────────────────────────────────────────

def setup_frontend_deps(npm: Path) -> None:
    """
    Run `npm install` inside /frontend only when node_modules is
    absent or package.json has changed since the last install.
    """
    log_section("Frontend — Node dependencies")

    pkg_json   = FRONTEND_DIR / "package.json"
    nm_dir     = FRONTEND_DIR / "node_modules"
    stamp_file = FRONTEND_DIR / "node_modules" / ".launcher_stamp"

    pkg_content = pkg_json.read_text(encoding="utf-8")

    needs_install = True
    if nm_dir.exists() and stamp_file.exists():
        if stamp_file.read_text(encoding="utf-8") == pkg_content:
            needs_install = False

    if needs_install:
        log_info("Running npm install …")
        result = subprocess.run(
            [str(npm), "install", "--prefer-offline"],
            cwd=str(FRONTEND_DIR),
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            log_error(
                "npm install failed. Output:\n"
                + (result.stderr or result.stdout)
            )
            sys.exit(1)
        stamp_file.write_text(pkg_content, encoding="utf-8")
        log_ok("Frontend dependencies installed.")
    else:
        log_ok("node_modules already up-to-date — skipping npm install.")


# ─────────────────────────────────────────────────────────────────
#  SERVICE LAUNCHERS
# ─────────────────────────────────────────────────────────────────

def _build_env() -> dict:
    """Return a clean copy of the current environment."""
    return dict(os.environ)


def start_backend(venv_py: Path, port: int) -> subprocess.Popen:
    """
    Launch uvicorn in the backend directory using the venv interpreter.
    Streams stdout/stderr to the console with a coloured prefix.
    """
    log_section("Starting backend  (FastAPI / uvicorn)")
    log_info(f"http://127.0.0.1:{port}  •  docs → /docs")

    cmd = [
        str(venv_py), "-m", "uvicorn",
        "main:app",
        "--host", "127.0.0.1",
        "--port", str(port),
        "--reload",                # enables hot-reload during development
        "--log-level", "warning",  # suppress noisy access logs; errors still shown
    ]

    proc = subprocess.Popen(
        cmd,
        cwd=str(BACKEND_DIR),
        env=_build_env(),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,   # merge so we capture everything
        text=True,
        bufsize=1,                  # line-buffered
    )

    # Stream backend output in a daemon thread so it does not block
    import threading
    def _pipe_output():
        prefix = _dim("[backend] ")
        for line in proc.stdout:
            # Surface uvicorn errors / startup warnings to the user
            stripped = line.rstrip()
            if stripped:
                print(f"{prefix}{stripped}")

    t = threading.Thread(target=_pipe_output, daemon=True, name="backend-logger")
    t.start()
    return proc


def start_frontend(npm: Path, port: int) -> subprocess.Popen:
    """
    Launch the Vite dev server inside the frontend directory.
    """
    log_section("Starting frontend  (Vite / React)")
    log_info(f"http://localhost:{port}")

    env = _build_env()
    # Allow Vite to pick up a non-default port via the VITE_PORT env var.
    # The vite.config.js in this project does not set a fixed port, so
    # Vite will use its own default (5173 in recent versions) unless told
    # otherwise.  We pass --port explicitly on the CLI for reliability.
    cmd = [str(npm), "run", "dev", "--", "--port", str(port), "--host", "127.0.0.1"]

    proc = subprocess.Popen(
        cmd,
        cwd=str(FRONTEND_DIR),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    import threading
    def _pipe_output():
        prefix = _dim("[frontend]")
        for line in proc.stdout:
            stripped = line.rstrip()
            if stripped:
                print(f"{prefix} {stripped}")

    t = threading.Thread(target=_pipe_output, daemon=True, name="frontend-logger")
    t.start()
    return proc


# ─────────────────────────────────────────────────────────────────
#  READINESS DETECTION
# ─────────────────────────────────────────────────────────────────

def _http_get_ok(url: str) -> bool:
    """Return True if the URL responds with an HTTP 2xx status."""
    try:
        with urllib.request.urlopen(url, timeout=2) as resp:
            return 200 <= resp.status < 400
    except Exception:
        return False


def wait_for_service(
    proc: subprocess.Popen,
    url: str,
    label: str,
    timeout: float = READINESS_TIMEOUT,
) -> None:
    """
    Poll `url` until it responds or we exceed `timeout`.
    Aborts with a clear message if the process dies before becoming ready.
    """
    log_info(f"Waiting for {label} to be ready…")
    deadline = time.monotonic() + timeout
    dots = 0

    while time.monotonic() < deadline:
        # Did the process crash before serving?
        if proc.poll() is not None:
            log_error(
                f"{label} exited unexpectedly (code {proc.returncode}). "
                "Check the output above for error details."
            )
            sys.exit(1)

        if _http_get_ok(url):
            # Clear the progress dots and print the ready message on a new line
            sys.stdout.write("\r" + " " * 60 + "\r")
            log_ok(f"{label} is ready  →  {url}")
            return

        # Animated feedback so the developer knows we haven't stalled
        dots = (dots + 1) % 4
        sys.stdout.write(f"\r  {'.' * dots}   ")
        sys.stdout.flush()
        time.sleep(READINESS_POLL)

    sys.stdout.write("\r" + " " * 60 + "\r")
    log_error(
        f"{label} did not become ready within {timeout}s. "
        f"Check that nothing else is using the port and review the logs above."
    )
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────
#  BROWSER OPENER
# ─────────────────────────────────────────────────────────────────

def open_browser(url: str) -> None:
    """Open the given URL in the user's default browser (best-effort)."""
    import webbrowser
    try:
        webbrowser.open(url)
        log_ok(f"Browser opened  →  {url}")
    except Exception:
        log_warn(f"Could not open browser automatically. Navigate to {url}")


# ─────────────────────────────────────────────────────────────────
#  GRACEFUL SHUTDOWN
# ─────────────────────────────────────────────────────────────────

_active_procs: list[subprocess.Popen] = []


def _shutdown(signum=None, frame=None):
    """Kill all child processes and exit cleanly."""
    print(f"\n\n  {_yellow('Shutting down…')}")
    for proc in _active_procs:
        if proc.poll() is None:
            try:
                if IS_WINDOWS:
                    # taskkill terminates the whole process tree on Windows
                    subprocess.run(
                        ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                        capture_output=True,
                    )
                else:
                    import signal as _signal
                    proc.send_signal(_signal.SIGTERM)
                    proc.wait(timeout=5)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
    log_ok("All services stopped. Goodbye.")
    sys.exit(0)


# ─────────────────────────────────────────────────────────────────
#  CLI
# ─────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="DLP Training Platform — unified launcher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_all.py                  Start both backend and frontend
  python run_all.py --backend-only   Start FastAPI only (port 8000)
  python run_all.py --frontend-only  Start Vite only (port 3000)
        """,
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--backend-only",
        action="store_true",
        help="Start the FastAPI backend only",
    )
    group.add_argument(
        "--frontend-only",
        action="store_true",
        help="Start the Vite dev server only",
    )
    return parser.parse_args()


# ─────────────────────────────────────────────────────────────────
#  MAIN ENTRYPOINT
# ─────────────────────────────────────────────────────────────────

def main() -> None:
    args = _parse_args()

    log_banner()

    # ── Register signal handlers for graceful shutdown ───────────
    signal.signal(signal.SIGINT,  _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    # ── Determine which services we need ────────────────────────
    run_backend  = not args.frontend_only
    run_frontend = not args.backend_only

    # ── Prerequisite checks ──────────────────────────────────────
    log_section("Checking prerequisites")

    py  = _require_python()
    npm = None

    if run_frontend:
        _require_node()
        npm = _require_npm()

    # ── Environment setup ────────────────────────────────────────
    venv_py: Optional[Path] = None
    if run_backend:
        venv_py = setup_backend_venv(py)

    if run_frontend:
        setup_frontend_deps(npm)

    # ── Port availability ────────────────────────────────────────
    log_section("Checking port availability")

    backend_port  = _find_free_port(BACKEND_PORT,  "Backend (FastAPI)")  if run_backend  else None
    frontend_port = _find_free_port(FRONTEND_PORT, "Frontend (Vite)")    if run_frontend else None

    if backend_port  == BACKEND_PORT:  log_ok(f"Backend port  {backend_port}  is free")
    if frontend_port == FRONTEND_PORT: log_ok(f"Frontend port {frontend_port} is free")

    # ── Launch services ──────────────────────────────────────────
    backend_proc  = None
    frontend_proc = None

    if run_backend:
        backend_proc = start_backend(venv_py, backend_port)
        _active_procs.append(backend_proc)

    if run_frontend:
        frontend_proc = start_frontend(npm, frontend_port)
        _active_procs.append(frontend_proc)

    # ── Wait for readiness ───────────────────────────────────────
    if run_backend:
        health_url = f"http://127.0.0.1:{backend_port}/docs"
        wait_for_service(backend_proc, health_url, "Backend", READINESS_TIMEOUT)

    if run_frontend:
        fe_url = f"http://127.0.0.1:{frontend_port}"
        wait_for_service(frontend_proc, fe_url, "Frontend", READINESS_TIMEOUT)

    # ── Open browser (only when both or frontend-only) ───────────
    if run_frontend:
        open_browser(f"http://localhost:{frontend_port}")

    # ── Ready summary ────────────────────────────────────────────
    print()
    print(f"  {_bold(_green('All services are running'))}")
    if run_backend:
        print(f"  {_cyan('Backend API')}  →  http://127.0.0.1:{backend_port}")
        print(f"  {_cyan('API Docs')}     →  http://127.0.0.1:{backend_port}/docs")
    if run_frontend:
        print(f"  {_cyan('Frontend')}     →  http://localhost:{frontend_port}")
    print(f"\n  {_dim('Press Ctrl+C to stop all services.')}\n")

    # ── Keep the launcher alive; let daemon threads stream logs ──
    try:
        while True:
            # Check child health every second so we surface crashes quickly
            for proc in list(_active_procs):
                if proc.poll() is not None:
                    label = (
                        "Backend"  if proc is backend_proc  else
                        "Frontend" if proc is frontend_proc else
                        "Service"
                    )
                    log_error(
                        f"{label} process exited unexpectedly "
                        f"(code {proc.returncode}). "
                        "Shutting down…"
                    )
                    _shutdown()
            time.sleep(1)
    except KeyboardInterrupt:
        _shutdown()


if __name__ == "__main__":
    main()
