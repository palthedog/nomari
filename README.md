# Nomari - a GTO solver for Fighting Games

[English](./README.md) / [日本語](./README-ja.md)

---

Nomari is a game theory calculator for fighting games like Street Fighter 6.
It enables you to compute game theory optimal (GTO) strategies for various situations.

Nomari can help you to answer questions like:
- Which combo can be expected to have more damages including following Oki attacks?
    - A combo has a higher damage (e.g. 2000dmg) but the opponent would wake-up at a distant location.
    - Another one has a lower damage (e.g. 1500dmg) but with following Oki-attacks.
        - ❓️What is the expected damage of the following Oki-attacks if you play it perfectly?
    - ❓️Which combo would have higher expected damage in total?
- ❓️What is an optimal mixed-strategy for an oki-situation for Marisa as the attacker?
    - The attacker's options would be:
        - Drive rush > Command Throw
        - Drive rush > 4HP combo
        - Drive rush > Guard
    - The defender's options would be:
        - Guard
        - Jump
        - Invincible Attack (OD DP)
    - ❓️How often should we choose "Command Throw" to maximize the expected damage/win-rate?
    - Yes, you can calculate the GTO defender's strategy as well.
        - ❓️How often should we choose "Guard" to minimize the expected damage?

## Demo page
https://palthedog.github.io/nomari/?example=marisa

