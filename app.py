"""
Phone  --OSC over Wi-Fi-->  this script  -->  your browser

Your phone sends OSC messages. This script catches them, remembers the
newest values of each one, and hands them to the web page when it asks.

Run it:      python app.py
Then open:   http://localhost:8000
"""

import logging
import socket
import threading
import time

from flask import Flask, jsonify
from pythonosc.dispatcher import Dispatcher
from pythonosc.osc_server import BlockingOSCUDPServer

OSC_PORT = 9000  # the phone sends to this port
WEB_PORT = 8000  # the browser opens this port

latest = {}  # newest values of every message, e.g. {"/gyrosc/gyro": [0.1, 0.2, 0.3]}
last_seen = 0  # the time the last message arrived


# ---------- 1. catch OSC messages from the phone ----------

def on_osc_message(address, *values):
    """Called for every OSC message. An OSC message is just a name plus some numbers."""
    global last_seen
    latest[address] = [v for v in values if isinstance(v, (int, float, str))]
    last_seen = time.time()


dispatcher = Dispatcher()
dispatcher.set_default_handler(on_osc_message)  # catch everything, whatever its name


# ---------- 2. give the newest values to the web page ----------

app = Flask(__name__)


@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.route("/data")
def data():
    return jsonify(
        messages=dict(latest),
        connected=time.time() - last_seen < 2,
        ip=my_ip(),
        port=OSC_PORT,
    )


def my_ip():
    """The address of this computer on the Wi-Fi network (the phone needs it)."""
    # Nothing is sent here: "connecting" only makes the computer pick the address
    # it would send from. The first target finds the Wi-Fi address even when a
    # VPN is on, the second one is a fallback.
    for target in ("224.0.0.251", "8.8.8.8"):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect((target, 80))
            return s.getsockname()[0]
        except OSError:
            pass
        finally:
            s.close()
    return "127.0.0.1"


# ---------- 3. start both ----------

if __name__ == "__main__":
    osc_server = BlockingOSCUDPServer(("0.0.0.0", OSC_PORT), dispatcher)
    threading.Thread(target=osc_server.serve_forever, daemon=True).start()

    logging.getLogger("werkzeug").setLevel(logging.ERROR)  # keep the terminal quiet
    print()
    print(f"  1. Open in your browser:   http://localhost:{WEB_PORT}")
    print(f"  2. On your phone, send OSC to:   IP {my_ip()}   port {OSC_PORT}")
    print("     (no phone? run  python fake_phone.py  in a second terminal)")
    print()
    app.run(port=WEB_PORT)
