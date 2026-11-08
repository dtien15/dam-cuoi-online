import base64
import json
import os
import queue
import sys
import threading
import time

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
commands = queue.Queue()
cancelled = set()
current = {"id": None, "cancel": None}

def emit(*parts):
    print("\t".join(map(str, parts)), flush=True)

def read_commands():
    for line in sys.stdin:
        try:
            command = json.loads(line)
            if command.get("type") == "cancel":
                if current["id"] == str(command.get("id")) and current["cancel"]:
                    current["cancel"].set()
                else:
                    cancelled.add(str(command.get("id")))
            else:
                commands.put(command)
        except Exception:
            pass

def main():
    print("VieNeu: loading Python package", file=sys.stderr, flush=True)
    try:
        from vieneu import Vieneu
        print("VieNeu: initializing ONNX model", file=sys.stderr, flush=True)
        tts = Vieneu(mode="v3turbo", backend="onnx", device="cpu",
                     precision=os.environ.get("VIENEU_PRECISION", "int8"),
                     threads=int(os.environ.get("VIENEU_THREADS", "4")))
        print("VieNeu: loading presets and warming stream", file=sys.stderr, flush=True)
        voices = []
        for label, voice_id in tts.list_preset_voices():
            details = tts._preset_voices.get(voice_id, {})
            gender = str(details.get("gender", "")).lower()
            voices.append({"id": voice_id, "name": voice_id, "gender": "F" if gender.startswith("f") else "M",
                           "label": label, "description": details.get("description", "")})
        for _ in tts.infer_stream("Xin chào.", voice="Trúc Ly", apply_watermark=False):
            pass
        print("VieNeu: ready", file=sys.stderr, flush=True)
        emit("READY", json.dumps(voices, ensure_ascii=False))
    except Exception as error:
        emit("FATAL", base64.b64encode(str(error).encode("utf-8")).decode("ascii"))
        return

    threading.Thread(target=read_commands, daemon=True).start()
    while True:
        command = commands.get()
        job_id = str(command.get("id", ""))
        if not job_id or job_id in cancelled:
            cancelled.discard(job_id)
            continue
        current["id"] = job_id
        current["cancel"] = threading.Event()
        started = time.perf_counter()
        try:
            voice = command.get("voice", "Trúc Ly")
            if not any(item["id"] == voice for item in voices):
                raise ValueError("Vui lòng chọn một preset VieNeu hợp lệ.")
            text = str(command.get("text", ""))[:400]
            for chunk in tts.infer_stream(text, voice=voice, apply_watermark=False):
                if current["cancel"].is_set():
                    break
                pcm = (chunk.clip(-1.0, 1.0) * 32767).astype("<i2", copy=False).tobytes()
                if pcm:
                    encoded = base64.b64encode(pcm).decode("ascii")
                    emit("CHUNK", job_id, encoded)
            emit("DONE", job_id, round(time.perf_counter() - started, 4))
        except Exception as error:
            emit("ERR", job_id, base64.b64encode(str(error).encode("utf-8")).decode("ascii"))
        finally:
            current["id"] = None
            current["cancel"] = None

if __name__ == "__main__":
    main()
