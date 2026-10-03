---
type: llm
focus: {source: file, path: "handshake.html"}
weight: 2
---
This is the source of an HTML page that should animate the TCP three-way handshake step by step.
PASS if: (1) it shows a client and a server and the three messages SYN, SYN-ACK and ACK in this order, with sequence
and acknowledgment numbers right if it shows them; (2) the picture builds up step by step, and each step has a short
caption; (3) the reader controls it: next and previous controls (buttons or keys), and play is optional; (4) it does
not depend on the network (no external scripts, fonts or images).
FAIL if it is a static page with no steps, the order of the messages is wrong, or the reader cannot step back.
