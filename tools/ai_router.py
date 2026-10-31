#!/usr/bin/env python3
"""Local Smart AI Failover Router v2.0 (Token-Multiplier Pool)."""
import hashlib, json, os, subprocess, threading, time, urllib.error, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".ai-providers.env"
USER_ENV = Path(os.path.expanduser("~")) / ".ai-providers.env"

def load_env(path):
    if path.exists():
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip(); value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value

load_env(ENV_FILE); load_env(USER_ENV)

def env(name, default=""):
    return os.environ.get(name, default).strip()

FAILOVER_STATUSES = {401, 402, 403, 429, 500, 502, 503, 504}
COOLDOWN_SECONDS = 60
_cooldowns = {}; _cooldown_lock = threading.Lock()
_rr_counter = 0; _rr_lock = threading.Lock()
_cache = {}; _cache_lock = threading.Lock()
_stats = {"requests": 0, "cache_hits": 0, "switches": 0}; _stats_lock = threading.Lock()

def set_cooldown(name):
    with _cooldown_lock: _cooldowns[name] = time.time() + COOLDOWN_SECONDS

def in_cooldown(name):
    with _cooldown_lock:
        until = _cooldowns.get(name, 0)
        if time.time() < until: return True
        _cooldowns.pop(name, None); return False

def first_ollama_model():
    configured = env("OLLAMA_MODEL")
    if configured: return configured
    try:
        r = subprocess.run(["ollama", "list"], capture_output=True, text=True, timeout=5)
        lines = [l for l in r.stdout.splitlines() if l.strip()]
        if len(lines) > 1: return lines[1].split()[0]
    except Exception: pass
    return "llama3.2"

def make_provider(name, key, base, model, preferred=None, requires_key=True):
    if requires_key and not key: return None
    if not base: return None
    if not model:
        if name.split(":")[0] == "OLLAMA": model = first_ollama_model()
        else: return None
    if not model: return None
    return {"name": name, "key": key, "base": base.rstrip("/"), "model": model,
            "preferred": set(preferred or ())}

def add_multi(providers, name, key, base, models_csv, default_models):
    if not base: return
    csv = models_csv if models_csv else default_models
    models = [m.strip() for m in (csv or "").split(",") if m.strip()]
    if not models: return
    for m in models:
        p = make_provider(f"{name}:{m}", key, base, m)
        if p: providers.append(p)
def build_providers():
    providers = []
    def S(name, key, base, model):
        p = make_provider(name, key, base, model, preferred={"smart-planner"})
        if p: providers.append(p)
    def F(name, key, base, model):
        p = make_provider(name, key, base, model, preferred={"fast-coder"})
        if p: providers.append(p)

    gem_key = env("GEMINI_API_KEY")
    S("GEMINI", gem_key, env("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai"),
      env("GEMINI_MODEL", "gemini-2.5-flash"))

    groq_key = env("GROQ_API_KEY")
    S("GROQ", groq_key, env("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
      env("GROQ_SMART_MODEL", "openai/gpt-oss-120b"))
    F("GROQ", groq_key, env("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
      env("GROQ_FAST_MODEL", "qwen/qwen3-32b"))

    mist_key = env("MISTRAL_API_KEY")
    S("MISTRAL", mist_key, env("MISTRAL_BASE_URL", "https://api.mistral.ai/v1"),
      env("MISTRAL_SMART_MODEL", "mistral-large-latest"))
    F("MISTRAL", mist_key, env("MISTRAL_BASE_URL", "https://api.mistral.ai/v1"),
      env("MISTRAL_FAST_MODEL", "codestral-latest"))

    or_key = env("OPENROUTER_API_KEY")
    S("OPENROUTER", or_key, env("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
      env("OPENROUTER_SMART_MODEL", "openrouter/free"))
    F("OPENROUTER", or_key, env("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
      env("OPENROUTER_FAST_MODEL", "openrouter/free"))

    hf_key = env("HF_TOKEN") or env("HUGGINGFACE_API_KEY")
    F("HUGGINGFACE", hf_key, env("HUGGINGFACE_BASE_URL", "https://router.huggingface.co/v1"),
      env("HF_FAST_MODEL", "Qwen/Qwen2.5-Coder-32B-Instruct"))

    # Ollama last resort (serves all models)
    ollama_default = env("OLLAMA_MODEL", "qwen2.5:3b")
    ollama_csv = env("OLLAMA_MODELS", ollama_default)
    for m in [x.strip() for x in ollama_csv.split(",") if x.strip()] or [ollama_default]:
        p = make_provider("OLLAMA", "", env("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1"), m, requires_key=False)
        if p: providers.append(p)

    providers = [p for p in providers if p["base"]]
    return providers

ALL_PROVIDERS = build_providers()


def chain_for(model):
    selected = []
    for provider in ALL_PROVIDERS:
        if provider["preferred"] and model not in provider["preferred"]:
            continue
        selected.append(provider)
    return selected

def build_headers(provider):
    headers = {"Content-Type": "application/json"}
    if provider["key"]:
        headers["Authorization"] = "Bearer " + provider["key"]
    name = provider["name"].split(":")[0]
    if name == "OPENROUTER":
        headers["HTTP-Referer"] = "http://localhost"
        headers["X-Title"] = "Rihal AI Router"
    if name == "HUGGINGFACE":
        headers["X-Wait-For-Model"] = "true"
    return headers
class RouterHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, *args): return
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    def _send_json(self, code, obj):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self._cors(); self.end_headers()
        try: self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError): pass

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ("/stats", "/v1/stats"):
            with _stats_lock: snap = dict(_stats)
            self._send_json(200, {"active_channels": len(ALL_PROVIDERS),
                "pool_channels": len([p for p in ALL_PROVIDERS if p["name"] != "OLLAMA"]),
                "ollama_last_resort": any(p["name"] == "OLLAMA" for p in ALL_PROVIDERS),
                "cache_hits": snap["cache_hits"], "switches": snap["switches"],
                "requests": snap["requests"], "providers": [p["name"] for p in ALL_PROVIDERS]})
            return
        if path in ("/v1/models", "/models"):
            now = int(time.time())
            data = [{"id": m, "object": "model", "created": now, "owned_by": "rihal-router"} for m in ("smart-planner", "fast-coder")]
            self._send_json(200, {"object": "list", "data": data}); return
        self._send_json(404, {"error": {"message": "not found", "type": "router_error"}})

    def do_POST(self):
        global _rr_counter
        if not (self.path.startswith("/v1/chat/completions") or self.path.startswith("/chat/completions")):
            self._send_json(404, {"error": {"message": "not found", "type": "router_error"}}); return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            self._send_json(400, {"error": {"message": "invalid json", "type": "invalid_request"}}); return
        model = body.get("model") or "smart-planner"
        stream = bool(body.get("stream"))
        with _stats_lock: _stats["requests"] += 1

        cache_key = None
        if (not stream) and body.get("temperature") == 0:
            try: cache_key = hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
            except Exception: cache_key = None
            if cache_key:
                with _cache_lock: cached = _cache.get(cache_key)
                if cached is not None:
                    with _stats_lock: _stats["cache_hits"] += 1
                    self._send_json(200, cached); return

        chain = chain_for(model)
        pool = [p for p in chain if p["name"] != "OLLAMA"]
        fallback = [p for p in chain if p["name"] == "OLLAMA"]
        with _rr_lock:
            start = _rr_counter; _rr_counter += 1
        ordered = (pool[start % len(pool):] + pool[:start % len(pool)]) if pool else []
        def try_provider(provider):
            url = provider["base"] + "/chat/completions"
            payload = dict(body); payload["model"] = provider["model"]; payload["stream"] = stream
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers=build_headers(provider), method="POST")
            try:
                resp = urllib.request.urlopen(req, timeout=300)
            except urllib.error.HTTPError as exc:
                eb = exc.read()
                if exc.code in FAILOVER_STATUSES:
                    set_cooldown(provider["name"]); return None
                try: parsed = json.loads(eb.decode("utf-8", "replace"))
                except Exception: parsed = {"error": {"message": eb.decode("utf-8", "replace"), "type": "upstream_error"}}
                return ("http", exc.code, parsed)
            except Exception:
                set_cooldown(provider["name"]); return None
            if stream:
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Connection", "close"); self._cors(); self.end_headers()
                try:
                    for chunk in resp: self.wfile.write(chunk); self.wfile.flush()
                except (BrokenPipeError, ConnectionResetError): pass
                finally: resp.close()
                return ("stream",)
            rb = resp.read(); resp.close()
            try:
                parsed = json.loads(rb.decode("utf-8")); parsed["model"] = model
            except Exception: return ("raw", rb)
            return ("json", parsed)

        for provider in ordered:
            if in_cooldown(provider["name"]):
                with _stats_lock: _stats["switches"] += 1
                continue
            res = try_provider(provider)
            if res is None:
                with _stats_lock: _stats["switches"] += 1
                continue
            kind = res[0]
            if kind == "http":
                self._send_json(res[1], res[2]); return
            if kind == "raw":
                rb = res[1]
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(rb))); self._cors(); self.end_headers()
                try: self.wfile.write(rb)
                except (BrokenPipeError, ConnectionResetError): pass
                return
            if kind == "json":
                parsed = res[1]
                if cache_key:
                    with _cache_lock: _cache[cache_key] = parsed
                self._send_json(200, parsed); return
            if kind == "stream": return

        for provider in fallback:
            if in_cooldown(provider["name"]): continue
            res = try_provider(provider)
            if res is None:
                with _stats_lock: _stats["switches"] += 1
                continue
            kind = res[0]
            if kind == "http":
                self._send_json(res[1], res[2]); return
            if kind == "raw":
                rb = res[1]
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(rb))); self._cors(); self.end_headers()
                try: self.wfile.write(rb)
                except (BrokenPipeError, ConnectionResetError): pass
                return
            if kind == "json":
                parsed = res[1]
                if cache_key:
                    with _cache_lock: _cache[cache_key] = parsed
                self._send_json(200, parsed); return
            if kind == "stream": return

        self._send_json(503, {"error": {"message": "all providers failed or in cooldown", "type": "router_error"}})

def main():
    server = ThreadingHTTPServer(("127.0.0.1", 8787), RouterHandler)
    server.allow_reuse_address = True
    server.serve_forever()

if __name__ == "__main__":
    main()

