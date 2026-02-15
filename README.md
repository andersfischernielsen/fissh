# fiSSH

Fish in your terminal.

---

![fish.gif](fish.gif)

---

To see it in action:

```sh
ssh isitafi.sh

# Depending on your SSH configuration, you may need to specify:
ssh -t isitafi.sh
```

---

# Development

```sh
bun install
```

To run:

```sh
bun run main.ts
```

Modify `main.ts` to change the renderer. Over SSH, view the rendering at `ssh localhost`.
