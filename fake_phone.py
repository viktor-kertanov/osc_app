"""
No phone at hand? This script pretends to be one.

It sends the same OSC messages that GyrOSC (iPhone) sends, with slowly
changing made-up numbers. It also shows how little code sending OSC takes.

Run it in a second terminal while app.py is running:   python fake_phone.py
"""

import math
import random
import time

from pythonosc.udp_client import SimpleUDPClient

phone = SimpleUDPClient("127.0.0.1", 9000)  # same computer, same port as app.py
print("Pretending to be a phone... press Ctrl+C to stop.")

start = time.time()
while True:
    t = time.time() - start

    # tilt: pitch, roll, yaw (in radians), swaying slowly
    phone.send_message("/gyrosc/gyro", [0.7 * math.sin(t * 0.5), 1.1 * math.sin(t * 0.3), 0.0])

    # compass: turning slowly, 0..360 degrees
    phone.send_message("/gyrosc/comp", [(t * 15) % 360])

    # magnetic field: about 50 normally, now and then a "magnet" comes close
    near_magnet = max(0, math.sin(t * 0.25)) ** 8
    phone.send_message("/gyrosc/mag", [20.0, 40.0 + 250 * near_magnet, -25.0])

    # movement: calm most of the time, a short shake every 8 seconds
    strength = 2.0 if t % 8 > 7.5 else 0.02
    phone.send_message("/gyrosc/accel", [random.uniform(-strength, strength) for _ in range(3)])

    time.sleep(1 / 30)  # 30 times per second
